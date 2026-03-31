import { Activity, Eye, Shield, UserCog } from "lucide-react";
import "./AdminOverviewCards.css";

export default function AdminOverviewCards({ summary }) {
  const cards = [
    {
      key: "visits",
      label: "Today Visits",
      value: summary.todayVisits,
      icon: Eye,
    },
    {
      key: "admin-actions",
      label: "Admin Actions",
      value: summary.adminActions,
      icon: Shield,
    },
    {
      key: "editor-actions",
      label: "Editor Actions",
      value: summary.editorActions,
      icon: UserCog,
    },
    {
      key: "last-six-hours",
      label: "Last 6h Events",
      value: summary.lastSixHours,
      icon: Activity,
    },
  ];

  return (
    <section className="adminOverviewCards">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article className="adminOverviewCards__card" key={card.key}>
            <p className="adminOverviewCards__label">{card.label}</p>
            <div className="adminOverviewCards__valueRow">
              <strong>{card.value}</strong>
              <Icon size={16} />
            </div>
          </article>
        );
      })}
    </section>
  );
}
