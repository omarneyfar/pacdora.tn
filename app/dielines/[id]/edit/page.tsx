import { DielineStudio } from "@/features/dielines/DielineStudio";

type EditDielinePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditDielinePage({ params }: EditDielinePageProps) {
  const { id } = await params;
  return <DielineStudio dielineId={id} />;
}
