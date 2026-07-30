import { useContext } from "react";
import { DisassemblyContext } from "./disassemblyContextValue";

export function useDisassembly() {
  return useContext(DisassemblyContext);
}
