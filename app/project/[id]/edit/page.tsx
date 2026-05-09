import { Builder } from "@/components/Builder";

type EditProjectPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditProjectPage({ params }: EditProjectPageProps) {
  const { id } = await params;
  return <Builder projectId={id} />;
}
