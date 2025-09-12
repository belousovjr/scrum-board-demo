import { ServiceContext } from "@/app/providers/ServiceContextProvider";
import { useContext } from "react";

export default function useServiceContext() {
  const context = useContext(ServiceContext);
  return context;
}
