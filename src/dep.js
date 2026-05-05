// while (true) {
    //   cap.read(frame);
    //   if (frame.empty) break;

    //   const current_frame = Math.round(vid.get(cv.CAP_PROP_POS_FRAMES));
    //   const idx = current_frame - 1; // convert to 0-based index

    //   const resized = frame.resize(fH, fW, 0, 0, cv.INTER_LINEAR);
    //   const fgmask = fgbg.apply(resized);

    //   const contours = fgmask.findContours(cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    //   let motion_detected = false;

    //   for (const contour of contours) {
    //     if (contour.area < 1000) continue;

    //     const boundRect = contour.boundingRect();
    //     const { x, y, width: w, height: h } = boundRect;
    //     const area = w * h;

    //     // Accept reasonable sizes
    //     if (fA * 0.01 < area && area < fA * 0.5) {
    //       resized.drawRectangle(
    //         new cv.Point2(x, y),
    //         new cv.Point2(x + w, y + h),
    //         new cv.Vec3(0, 255, 0),
    //         2
    //       );

    //       fs.appendFileSync(
    //         "motion_log.txt",
    //         `Frame ${current_frame}: Width ${w}, Height ${h}, Area ${w * h}, Frame Size ${resized.sizes}\n`
    //       );

    //       motion_detected = true;
    //     }
    //   }

    //   // Buffer logic in frames
    //   if (motion_detected) {
    //     last_frame_detection = current_frame;
    //   }

    //   const within_buffer = current_frame - last_frame_detection <= buffer_frames;

    //   if (motion_detected) {
    //     const current_timestamp = format(new Date(), "yyyy-MM-dd HH:mm:ss");
    //     frame_detected[idx] = true;

    //     const timestamp_seconds = current_frame / fps;
    //     detection_zones.push(timestamp_seconds);

    //     // Note: your Python code draws on `frame1` here — assuming resized is intended
    //     resized.putText(
    //       `Motion Detected: ${current_timestamp}`,
    //       new cv.Point2(10, 30),
    //       cv.FONT_HERSHEY_SIMPLEX,
    //       0.7,
    //       new cv.Vec3(0, 0, 255),
    //       2,
    //       cv.LINE_AA
    //     );
    //   }

    //   cv.imshow("Background Subtraction", resized);
    //   cv.imshow("Foreground Mask", fgmask);

    //   if (cv.waitKey(30) === 27) break; // ESC to quit
    // }

    // cap.delete(); // Python has a bug here: `vid.release` (missing parens) — fixed
    // cv.destroyAllWindows();