# BIGGY LINK Weather Dashboard

A responsive weather dashboard built with plain HTML, CSS, and JavaScript ES modules.

## Features

- Current conditions and a seven-day forecast.
- Search for a city and choose between matching locations.
- Add and remove favourite locations using the star; select a saved location to load its forecast.
- Favourites, temperature units, color theme, and the last viewed location are saved in `localStorage`.
- Switch between Celsius and Fahrenheit without another API request.
- Use the browser's location permission to load local weather.
- Loading skeletons, accessible status and error messages, and responsive light/dark themes.
- Restore the last viewed location when the dashboard is reopened.

## API

Weather and city information comes from [Open-Meteo](https://open-meteo.com/), which does not require an API key:

- Geocoding: `https://geocoding-api.open-meteo.com/v1/search`
- Forecast: `https://api.open-meteo.com/v1/forecast`

## Screenshots

_Screenshot placeholder: add dashboard screenshots here._

## What I learned

- Using `async`/`await`, `fetch`, and `AbortController` to coordinate API requests and cancel outdated searches.
- Formatting and converting weather data in the browser.
- Persisting preferences and saved locations with `localStorage`.
- Handling geolocation permission and errors.
- Building dynamic, accessible UI elements with DOM APIs and `textContent`.
- Creating responsive layouts and theme variants with CSS custom properties.

## Run locally

Open `index.html` from a local web server. Geolocation generally requires a secure context, such as `localhost` or HTTPS, and browser permission.
