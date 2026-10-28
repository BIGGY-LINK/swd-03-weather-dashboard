import { getForecast, searchCity } from "./api.js";
import {
  hideCityChoices,
  renderCityChoices,
  renderFavorites,
  renderToday,
  renderUnit,
  renderWeather,
  setLoading,
  setStatus,
} from "./ui.js";
import weatherCodes from "./weatherCodes.js";

const favoritesKey = "atmos-favorites";
const unitKey = "atmos-temperature-unit";
const themeKey = "atmos-theme";
const lastViewedKey = "atmos-last-viewed";
const form = document.querySelector("#search-form");
const searchInput = document.querySelector("#city-search");
const favoriteButton = document.querySelector("#favorite-toggle");
const locationButton = document.querySelector("#location-button");
const themeButton = document.querySelector("#theme-toggle");

let activeWeather;
let currentRequest;
let favorites = loadFavorites();
let unit = loadUnit();
let theme = loadTheme();

function loadFavorites() {
  try {
    const saved = JSON.parse(localStorage.getItem(favoritesKey) ?? "[]");
    if (!Array.isArray(saved)) return [];

    return saved
      .filter((favorite) => favorite && (favorite.name || favorite.city))
      .map((favorite) => ({
        name: favorite.name ?? favorite.city,
        country: favorite.country ?? "",
        latitude: Number.isFinite(favorite.latitude) ? favorite.latitude : null,
        longitude: Number.isFinite(favorite.longitude) ? favorite.longitude : null,
      }));
  } catch (error) {
    console.error("Could not read saved favourites.", error);
    return [];
  }
}

function loadUnit() {
  try {
    return localStorage.getItem(unitKey) === "F" ? "F" : "C";
  } catch (error) {
    console.error("Could not read the saved temperature unit.", error);
    return "C";
  }
}

function loadTheme() {
  try {
    return localStorage.getItem(themeKey) === "light" ? "light" : "dark";
  } catch (error) {
    console.error("Could not read the saved color theme.", error);
    return "dark";
  }
}

function applyTheme(nextTheme) {
  theme = nextTheme;
  document.documentElement.dataset.theme = theme;
  const isLight = theme === "light";
  themeButton.setAttribute("aria-pressed", String(isLight));
  themeButton.setAttribute("aria-label", `Switch to ${isLight ? "dark" : "light"} mode`);
  themeButton.querySelector(".theme-toggle-icon").textContent = isLight ? "☾" : "☼";
  themeButton.querySelector(".theme-toggle-label").textContent = isLight ? "Dark mode" : "Light mode";
  document.querySelector('meta[name="theme-color"]').content = isLight ? "#e8eef8" : "#111a35";
}

function saveFavorites() {
  try {
    localStorage.setItem(favoritesKey, JSON.stringify(favorites.map(({ name, country, latitude, longitude }) => ({
      name,
      country,
      latitude,
      longitude,
    }))));
  } catch (error) {
    console.error("Could not save favourites.", error);
    setStatus("Your browser couldn't save favourites. They will be cleared when you leave.", "error");
  }
}

function saveLastViewed(location) {
  try {
    localStorage.setItem(lastViewedKey, JSON.stringify({
      name: location.name,
      country: location.country,
      region: location.region ?? "",
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: location.timezone,
    }));
  } catch (error) {
    console.error("Could not save the last viewed city.", error);
  }
}

function loadLastViewed() {
  try {
    const location = JSON.parse(localStorage.getItem(lastViewedKey) ?? "null");
    if (
      location
      && typeof location.name === "string"
      && Number.isFinite(location.latitude)
      && Number.isFinite(location.longitude)
    ) {
      return location;
    }
  } catch (error) {
    console.error("Could not read the last viewed city.", error);
  }
  return null;
}

function beginRequest() {
  if (currentRequest) currentRequest.abort();
  currentRequest = new AbortController();
  hideCityChoices();
  setLoading();
  return currentRequest;
}

function isAbortError(error) {
  return error instanceof Error && error.name === "AbortError";
}

function showWeatherError(error, fallback) {
  if (!isAbortError(error)) {
    setStatus(error instanceof Error ? error.message : fallback, "error");
  }
}

async function loadLocation(location, controller = beginRequest()) {
  let forecast;
  try {
    forecast = await getForecast(location.latitude, location.longitude, controller.signal);
  } catch (error) {
    if (currentRequest === controller) {
      showWeatherError(error, "Something went wrong while loading the forecast.");
    }
    return;
  }

  if (controller.signal.aborted || currentRequest !== controller) return;

  try {
    const timezone = forecast.timezone ?? location.timezone;
    const currentConditions = weatherCodes[forecast.current.weather_code] ?? {
      label: "Conditions unavailable",
      emoji: "🌡️",
    };
    const weather = {
      city: location.name,
      region: location.region ?? "",
      country: location.country,
      latitude: location.latitude,
      longitude: location.longitude,
      timezone,
      temperature: forecast.current.temperature_2m,
      humidity: forecast.current.relative_humidity_2m,
      condition: currentConditions.label,
      icon: currentConditions.emoji,
      wind: Math.round(forecast.current.wind_speed_10m),
      localTime: new Intl.DateTimeFormat("en", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: timezone,
      }).format(new Date()),
      forecast: forecast.daily.time.map((date, index) => {
        const conditions = weatherCodes[forecast.daily.weather_code[index]] ?? {
          label: "Conditions unavailable",
          emoji: "🌡️",
        };
        const calendarDate = new Date(`${date}T12:00:00Z`);
        return {
          date,
          label: new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "UTC" }).format(calendarDate),
          icon: conditions.emoji,
          high: forecast.daily.temperature_2m_max[index],
          low: forecast.daily.temperature_2m_min[index],
        };
      }),
    };

    activeWeather = weather;
    renderWeather(weather, unit, favorites);
    renderFavorites(favorites, weather, unit);
    saveLastViewed(location);
    setStatus();
    searchInput.value = "";
    hideCityChoices();
  } catch (error) {
    showWeatherError(error, "Something went wrong while displaying the forecast.");
  }
}

async function showCity(city, showMatches = true) {
  const controller = beginRequest();
  let cities;
  try {
    cities = await searchCity(city, controller.signal);
  } catch (error) {
    if (currentRequest === controller) {
      showWeatherError(error, "Something went wrong while searching for that city.");
    }
    return;
  }

  if (controller.signal.aborted || currentRequest !== controller) return;

  if (cities.length === 0) {
    setStatus(`We couldn't find "${city}". Check the spelling or try another city.`, "error");
    return;
  }

  if (cities.length > 1 && showMatches) {
    renderCityChoices(cities, (location) => {
      if (currentRequest !== controller || controller.signal.aborted) return;
      setLoading();
      loadLocation(location, controller);
    });
    setStatus("Several places match. Choose a location from the list.");
    document.querySelector("#city-results .city-result")?.focus();
    return;
  }

  loadLocation(cities[0], controller);
}

async function useMyLocation() {
  if (!navigator.geolocation) {
    setStatus("Your browser doesn't support location access. Search for a city instead.", "error");
    return;
  }

  const controller = beginRequest();
  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      });
    });

    if (controller.signal.aborted || currentRequest !== controller) return;

    loadLocation({
      name: "My location",
      country: "Current location",
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }, controller);
  } catch (error) {
    if (currentRequest !== controller || controller.signal.aborted) return;
    if (error && error.code === 1) {
      setStatus("Location permission was denied. Allow location access in your browser settings or search for a city.", "error");
    } else if (error && error.code === 3) {
      setStatus("We couldn't get your location in time. Please try again or search for a city.", "error");
    } else {
      setStatus("Your location couldn't be determined. Check your device settings or search for a city.", "error");
    }
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const city = searchInput.value.trim();
  if (city) showCity(city);
});

locationButton.addEventListener("click", useMyLocation);

searchInput.addEventListener("input", () => {
  if (!document.querySelector("#city-results").hidden) {
    hideCityChoices();
    setStatus();
  }
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".search-wrap") && !document.querySelector("#city-results").hidden) {
    hideCityChoices();
    setStatus();
  }
});

document.querySelectorAll(".unit-button").forEach((button) => {
  button.addEventListener("click", () => {
    unit = button.dataset.unit;
    try {
      localStorage.setItem(unitKey, unit);
    } catch (error) {
      console.error("Could not save the temperature unit.", error);
      setStatus("Your browser couldn't save the temperature preference.", "error");
    }
    renderUnit(unit);
    if (activeWeather) {
      renderWeather(activeWeather, unit, favorites);
      renderFavorites(favorites, activeWeather, unit);
    }
  });
});

themeButton.addEventListener("click", () => {
  applyTheme(theme === "dark" ? "light" : "dark");
  try {
    localStorage.setItem(themeKey, theme);
  } catch (error) {
    console.error("Could not save the color theme.", error);
    setStatus("Your browser couldn't save the theme preference.", "error");
  }
});

favoriteButton.addEventListener("click", () => {
  if (!activeWeather) return;

  const existingIndex = favorites.findIndex((favorite) => (
    favorite.name.toLocaleLowerCase() === activeWeather.city.toLocaleLowerCase()
      && favorite.country === activeWeather.country
      && favorite.latitude === activeWeather.latitude
      && favorite.longitude === activeWeather.longitude
  ));
  if (existingIndex >= 0) {
    favorites.splice(existingIndex, 1);
  } else {
    favorites.push({
      name: activeWeather.city,
      country: activeWeather.country,
      latitude: activeWeather.latitude,
      longitude: activeWeather.longitude,
    });
  }

  saveFavorites();
  renderWeather(activeWeather, unit, favorites);
  renderFavorites(favorites, activeWeather, unit);
});

document.addEventListener("favorites:remove", (event) => {
  const removed = event.detail;
  favorites = favorites.filter((favorite) => !(
    favorite.name === removed.name
      && favorite.country === removed.country
      && favorite.latitude === removed.latitude
      && favorite.longitude === removed.longitude
  ));
  saveFavorites();
  if (activeWeather) renderWeather(activeWeather, unit, favorites);
  renderFavorites(favorites, activeWeather, unit);
});

document.addEventListener("weather:select", (event) => {
  const location = event.detail;
  if (Number.isFinite(location.latitude) && Number.isFinite(location.longitude)) {
    loadLocation(location);
  } else {
    showCity(location.name);
  }
});

async function initializeDashboard() {
  const lastViewed = loadLastViewed();
  if (lastViewed) {
    loadLocation(lastViewed);
    return;
  }

  try {
    if (navigator.permissions) {
      const permission = await navigator.permissions.query({ name: "geolocation" });
      if (permission.state === "granted") {
        await useMyLocation();
        return;
      }
    }
  } catch (error) {
    console.error("Could not check the location permission.", error);
  }

  showCity("Seattle", false);
}

renderToday();
applyTheme(theme);
renderUnit(unit);
renderFavorites(favorites, activeWeather, unit);
initializeDashboard();
