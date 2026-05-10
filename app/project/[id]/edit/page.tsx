import { BuilderShell } from "@/features/builder/BuilderShell";

type EditProjectPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditProjectPage({ params }: EditProjectPageProps) {
  const { id } = await params;
  return <BuilderShell projectId={id} />;
}
