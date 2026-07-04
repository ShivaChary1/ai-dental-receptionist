import { Construction } from "lucide-react";
import EmptyState from "./ui/EmptyState.jsx";

export default function Placeholder({ title, phase }) {
  return (
    <EmptyState
      icon={Construction}
      title={title}
      description={phase ? `Coming in ${phase}.` : "Coming soon."}
      className="mt-16"
    />
  );
}
