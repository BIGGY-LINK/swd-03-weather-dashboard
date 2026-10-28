const weekdayFormatter = new Intl.DateTimeFormat("en", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

function displayTemperature(celsius, unit) {
  const temperature = unit === "F" ? (celsius * 9) / 5 + 32 : celsius;
  return Math.round(temperature);
}

function createTemperature(value, unit, className) {
  const temperature = document.createElement("span");
  if (className) temperature.className = className;
  temperature.textContent = `${displayTemperature(value, unit)}°${unit}`;
  return temperature;
}

export function renderWeather(weather, unit, favorites = []) {
  document.querySelector("#city-name").textContent = weather.city;
  document.querySelector("#location-label").textContent = [weather.city, weather.region, weather.country]
    .filter(Boolean)
    .join(", ");
  document.querySelector("#condition").textContent = weather.condition;
  document.querySelector("#temperature").textContent = `${displayTemperature(weather.temperature, unit)}°${unit}`;
  document.querySelector("#wind-speed").textContent = `${weather.wind} km/h`;
  document.querySelector("#humidity").textContent = `${weather.humidity}%`;
  document.querySelector("#local-time").textContent = weather.localTime;
  document.querySelector("#weather-emoji").textContent = weather.icon;

  const favoriteButton = document.querySelector("#favorite-toggle");
  const isFavorite = favorites.some((favorite) => (
    favorite.name.toLocaleLowerCase() === weather.city.toLocaleLowerCase()
      && favorite.country === weather.country
      && favorite.latitude === weather.latitude
      && favorite.longitude === weather.longitude
  ));
  favoriteButton.setAttribute("aria-label", `${isFavorite ? "Remove" : "Add"} ${weather.city} ${isFavorite ? "from" : "to"} favourites`);
  favoriteButton.setAttribute("aria-pressed", String(isFavorite));
  favoriteButton.dataset.city = weather.city;
  favoriteButton.querySelector("span").textContent = isFavorite ? "★" : "☆";

  const forecast = document.querySelector("#forecast-grid");
  forecast.replaceChildren(...weather.forecast.map((day) => {
    const card = document.createElement("article");
    card.className = "forecast-card";

    const dayLabel = document.createElement("span");
    dayLabel.className = "forecast-day";
    dayLabel.textContent = day.label;

    const icon = document.createElement("span");
    icon.className = "forecast-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = day.icon;

    const temperatures = document.createElement("span");
    temperatures.className = "forecast-temps";
    temperatures.append(
      createTemperature(day.high, unit),
      createTemperature(day.low, unit),
    );

    card.append(dayLabel, icon, temperatures);
    return card;
  }));
}

export function renderCityChoices(cities, onChoose) {
  const results = document.querySelector("#city-results");
  results.replaceChildren();

  cities.forEach((city, index) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "city-result";
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", "false");
    option.id = `city-result-${index}`;
    option.textContent = [city.name, city.region, city.country].filter(Boolean).join(", ");
    option.addEventListener("click", () => onChoose(city));
    results.append(option);
  });

  results.hidden = cities.length === 0;
  document.querySelector("#city-search").setAttribute("aria-expanded", String(cities.length > 0));
}

export function hideCityChoices() {
  const results = document.querySelector("#city-results");
  results.hidden = true;
  results.replaceChildren();
  document.querySelector("#city-search").setAttribute("aria-expanded", "false");
}

export function renderFavorites(favorites, activeWeather) {
  const list = document.querySelector("#favorites-list");
  list.replaceChildren();

  if (favorites.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-favorites";
    empty.textContent = "No saved places yet. Add a city with the star button.";
    list.append(empty);
  } else {
    favorites.forEach((city) => {
      const item = document.createElement("li");
      item.className = "favorite-item";

      const details = document.createElement("span");
      const name = document.createElement("span");
      name.className = "favorite-city";
      name.textContent = city.name;
      const condition = document.createElement("span");
      condition.className = "favorite-condition";
      condition.textContent = city.country;
      details.append(name, condition);

      const removeButton = document.createElement("button");
      removeButton.className = "favorite-remove";
      removeButton.type = "button";
      removeButton.setAttribute("aria-label", `Remove ${city.name} from favourites`);
      removeButton.textContent = "×";
      removeButton.addEventListener("click", () => {
        document.dispatchEvent(new CustomEvent("favorites:remove", { detail: city }));
      });

      const selectButton = document.createElement("button");
      selectButton.type = "button";
      selectButton.className = "favorite-select";
      selectButton.setAttribute("aria-label", `Show weather for ${city.name}, ${city.country}`);
      selectButton.append(details);
      selectButton.addEventListener("click", () => {
        document.dispatchEvent(new CustomEvent("weather:select", { detail: city }));
      });

      item.append(selectButton, removeButton);
      list.append(item);
    });
  }

  document.querySelector("#favorite-count").textContent = String(favorites.length);
  const favoriteButton = document.querySelector("#favorite-toggle");
  if (activeWeather) {
    const currentFavorite = favorites.some((favorite) => (
      favorite.name.toLocaleLowerCase() === activeWeather.city.toLocaleLowerCase()
        && favorite.country === activeWeather.country
        && favorite.latitude === activeWeather.latitude
        && favorite.longitude === activeWeather.longitude
    ));
    favoriteButton.setAttribute("aria-pressed", String(currentFavorite));
    favoriteButton.setAttribute("aria-label", `${currentFavorite ? "Remove" : "Add"} ${activeWeather.city} ${currentFavorite ? "from" : "to"} favourites`);
    favoriteButton.querySelector("span").textContent = currentFavorite ? "★" : "☆";
  }
}

export function renderUnit(unit) {
  document.querySelectorAll(".unit-button").forEach((button) => {
    const selected = button.dataset.unit === unit;
    button.setAttribute("aria-pressed", String(selected));
  });
}

export function setStatus(message = "", type = "status") {
  const status = document.querySelector("#status-message");
  const error = document.querySelector("#error-message");
  status.classList.remove("status-loading");
  status.removeAttribute("aria-label");
  status.hidden = type !== "status" || !message;
  error.hidden = type !== "error" || !message;
  status.textContent = type === "status" ? message : "";
  error.textContent = type === "error" ? message : "";
}

export function setLoading() {
  const status = document.querySelector("#status-message");
  const error = document.querySelector("#error-message");
  error.hidden = true;
  error.textContent = "";
  status.hidden = false;
  status.classList.add("status-loading");
  status.setAttribute("aria-label", "Loading weather");
  status.replaceChildren();

  for (let index = 0; index < 3; index += 1) {
    const skeleton = document.createElement("span");
    skeleton.className = `loading-skeleton loading-skeleton-${index + 1}`;
    skeleton.setAttribute("aria-hidden", "true");
    status.append(skeleton);
  }
}

export function renderToday() {
  document.querySelector("#today-label").textContent = weekdayFormatter.format(new Date());
}
