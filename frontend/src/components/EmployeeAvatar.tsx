import { Avatar } from "@mantine/core";

export function EmployeeAvatar({
  firstName,
  lastName,
  color,
}: {
  firstName: string;
  lastName: string;
  color: string | null;
}) {
  const selected = color || "var(--mantine-color-bukioo-6)";
  return (
    <Avatar
      radius="xl"
      color="bukioo"
      aria-hidden="true"
      styles={{
        placeholder: {
          color: selected,
          border: `1px solid ${selected}`,
          backgroundColor: `color-mix(in srgb, ${selected} 12%, transparent)`,
        },
      }}
    >
      {firstName.charAt(0)}
      {lastName.charAt(0)}
    </Avatar>
  );
}
