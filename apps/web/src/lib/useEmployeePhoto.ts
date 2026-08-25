import { useEffect, useState } from "react";
import { api } from "./api";

export function useEmployeePhoto(employeeId: string | undefined, hasPhoto: boolean) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!employeeId || !hasPhoto) {
      setUrl(null);
      return;
    }
    let objectUrl: string | null = null;
    let cancelled = false;
    api.getBlobUrl(`/api/employees/${employeeId}/photo`).then((result) => {
      if (cancelled) return;
      objectUrl = result;
      setUrl(result);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [employeeId, hasPhoto]);

  return url;
}
