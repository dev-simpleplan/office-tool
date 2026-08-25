import { z } from "zod";

/** HTML <select> "none selected" options submit "" through React Hook Form,
 *  which fails a plain .uuid() check — treat "" the same as absent/null. */
export const optionalUuid = () =>
  z.preprocess((v) => (v === "" ? undefined : v), z.string().uuid().optional().nullable());
