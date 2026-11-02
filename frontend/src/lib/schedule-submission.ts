import type { SchedulePreview } from "./scheduling-api";

export async function submitScheduleChange({
  preview,
  save,
  reviewedRestoredDay,
  restoring,
  onChecked,
  onWriting,
}: {
  preview: () => Promise<SchedulePreview>;
  save: () => Promise<SchedulePreview>;
  reviewedRestoredDay?: SchedulePreview["restoredDay"];
  restoring: boolean;
  onChecked: (result: SchedulePreview) => void;
  onWriting: () => void;
}): Promise<"saved" | "conflict" | "review"> {
  const result = await preview();
  onChecked(result);
  if (!result.ok) return "conflict";
  if (
    restoring &&
    JSON.stringify(result.restoredDay) !== JSON.stringify(reviewedRestoredDay)
  )
    return "review";
  onWriting();
  await save();
  return "saved";
}
