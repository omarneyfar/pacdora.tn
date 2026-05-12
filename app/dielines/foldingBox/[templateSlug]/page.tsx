import { DielineBuilderShell } from "@/features/dieline-builder";

export default async function FoldingBoxTemplatePage({
  params,
}: {
  params: Promise<{ templateSlug: string }>;
}) {
  const { templateSlug } = await params;
  return <DielineBuilderShell categorySlug="foldingBox" templateSlug={templateSlug} />;
}
