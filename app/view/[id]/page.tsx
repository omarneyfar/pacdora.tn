import { ProjectViewer } from "@/components/ProjectViewer";

type ViewPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ViewPage({ params }: ViewPageProps) {
  const { id } = await params;
  return <ProjectViewer projectId={id} />;
}
