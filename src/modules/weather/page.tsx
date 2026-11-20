import { getTranslations } from "next-intl/server";

import { WeatherView } from "./views/weather-view";

export async function generateMetadata() {
  const t = await getTranslations("weather.meta");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function WeatherPage() {
  return <WeatherView />;
}
