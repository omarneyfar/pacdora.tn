import { BuilderShell } from "@/features/builder/BuilderShell";
import { StoreProvider } from "@/store/StoreProvider";

type EditProjectPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditProjectPage({ params }: EditProjectPageProps) {
  const { id } = await params;
  return (
    <StoreProvider key={id}>
      <BuilderShell projectId={id} />
    </StoreProvider>
  );
}
