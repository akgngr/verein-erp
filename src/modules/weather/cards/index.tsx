import { CloudSun } from "lucide-react";

import { defineCards } from "@/shared/types/dashboard";
import { weatherPermissions } from "../permissions";
import { getWeatherData } from "../services/weather";

export const cards = defineCards([
  {
    key: "current",
    titleKey: "cards.current.title",
    descriptionKey: "cards.current.description",
    icon: CloudSun,
    size: "md",
    defaultVisible: true,
    href: "/weather",
    permission: { definition: weatherPermissions, action: "view" },
    render: async () => {
      const weather = await getWeatherData();
      const { WeatherCardBody } = await import("./weather-card-body");
      return <WeatherCardBody initialWeather={weather} />;
    },
  },
]);
