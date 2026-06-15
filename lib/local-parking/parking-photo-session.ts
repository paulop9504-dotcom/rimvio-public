let pendingPhotoCapture = false;

export function armParkingPhotoCapture() {
  pendingPhotoCapture = true;
}

export function isParkingPhotoCapturePending() {
  return pendingPhotoCapture;
}

export function clearParkingPhotoCapture() {
  pendingPhotoCapture = false;
}

export function consumeParkingPhotoCapture() {
  const armed = pendingPhotoCapture;
  pendingPhotoCapture = false;
  return armed;
}
