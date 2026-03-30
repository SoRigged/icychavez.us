export interface Service {
  name: string;
  description: string;
  url: string;
  icon: string;
  status: "live" | "coming-soon";
}

export const services: Service[] = [
  {
    name: "Chavez Cookbook",
    description: "Family recipes passed down through generations",
    url: "https://cookbook.icychavez.us",
    icon: "🍳",
    status: "coming-soon",
  },
  {
    name: "Plex",
    description: "Movies, shows, and media streaming",
    url: "https://plex.icychavez.us",
    icon: "🎬",
    status: "coming-soon",
  },
  {
    name: "Pi-hole",
    description: "Network-wide ad blocking",
    url: "https://pihole.icychavez.us",
    icon: "🛡️",
    status: "coming-soon",
  },
  {
    name: "Downloads",
    description: "Download client and automation",
    url: "https://downloads.icychavez.us",
    icon: "⬇️",
    status: "coming-soon",
  },
];
