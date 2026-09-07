import { IconList, IconPulse, IconShield, IconUser } from "./icons.jsx";

// Mobile-only bottom navigation (hidden >= 701px via CSS). "More" is not a
// view — it opens the account/settings bottom sheet via onOpenMore.
export default function TabBar({ view, isAdmin, onSelect, onOpenMore }) {
  const items = [
    { key: "browse", label: "Browse", icon: IconList },
    { key: "status", label: "Status", icon: IconPulse },
    ...(isAdmin ? [{ key: "admin", label: "Admin", icon: IconShield }] : []),
  ];

  return (
    <nav className="tab-bar" aria-label="Main navigation">
      {items.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          className={`tab-item ${view === key ? "active" : ""}`}
          onClick={() => onSelect(key)}
        >
          <Icon size={22} />
          <span>{label}</span>
        </button>
      ))}
      <button type="button" className="tab-item" onClick={onOpenMore}>
        <IconUser size={22} />
        <span>More</span>
      </button>
    </nav>
  );
}
