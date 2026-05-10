import { BuilderShell } from "@/features/builder/BuilderShell";
import { StoreProvider } from "@/store/StoreProvider";

type HomeProps = {
  searchParams?: Promise<{ dielineId?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;

  return (
    <StoreProvider key="new-project">
      <BuilderShell initialDielineId={params?.dielineId} />
    </StoreProvider>
  );
}
