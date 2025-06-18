export default function RentalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex flex-1 flex-col gap-2 px-4">{children}</div>;
}
