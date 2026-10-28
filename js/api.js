const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

async function fetchJson(url, signal) {
  let response;
  try {
    response = await fetch(url, { signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    if (error instanceof Error) {
      throw new Error(`Could not reach Open-Meteo: ${error.message}`);
    }
    throw new Error("Could not reach Open-Meteo.");
  }

  if (!response.ok) {
    throw new Error(`Open-Meteo request failed (${response.status} ${response.statusText}).`);
  }

  try {
    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    if (error instanceof Error) {
      throw new Error(`Open-Meteo returned an invalid response: ${error.message}`);
    }
    throw new Error("Open-Meteo returned an invalid response.");
  }
}

export async function searchCity(name, signal) {
  const query = name.trim();
  if (!query) {
    return [];
  }

  const url = `${GEOCODING_URL}?name=${encodeURIComponent(query)}&count=5`;
  try {
    const data = await fetchJson(url, signal);
    return (data.results ?? []).map(({ name: cityName, admin1, country, latitude, longitude, timezone }) => ({
      name: cityName,
      region: admin1 ?? "",
      country,
      latitude,
      longitude,
      timezone,
    }));
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    if (error instanceof Error) {
      throw new Error(`City search failed: ${error.message}`);
    }
    throw new Error("City search failed.");
  }
}

export async function getForecast(lat, lon, signal) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    timezone: "auto",
  });

  return fetchJson(`${FORECAST_URL}?${params}`, signal);
}
