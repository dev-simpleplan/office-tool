export interface AvatarProps {
  name: string;
  photoUrl?: string | null;
}

export function Avatar({ name, photoUrl }: AvatarProps) {
  if (photoUrl) {
    return <img src={photoUrl} alt={name} className="op-avatar op-avatar--photo" />;
  }
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return <div className="op-avatar">{initials}</div>;
}
