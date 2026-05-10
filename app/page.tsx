import { BuilderShell } from "@/features/builder/BuilderShell";
import { StoreProvider } from "@/store/StoreProvider";

export default function Home() {
  return (
    <StoreProvider key="new-project">
      <BuilderShell />
    </StoreProvider>
  );
}
