import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/shared/components/ui/page-header";
import { getOrganizationWeather } from "../services/weather";
import { WeatherDetails } from "../components/weather-details";

export async function WeatherView() {
  const [t, initialWeather] = await Promise.all([
    getTranslations("weather"),
    getOrganizationWeather(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
      />
      <WeatherDetails initialWeather={initialWeather} />
    </div>
  );
}
