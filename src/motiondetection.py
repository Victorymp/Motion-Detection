import cv2
import numpy as np
from cv2 import VideoCapture

def get_input_video(path) -> VideoCapture :
  return cv2.VideoCapture(path)

def main():
  vid = get_input_video(r"C:\Users\mpoko\Workspaces\Motion-Detection\src\input-files\WildLifeExample.mp4")
  # Loop until the end of the video
  while (vid.isOpened()):
    # Capture frame-by-frame
    ret, frame = vid.read()
    frame = cv2.resize(frame, (440, 280), fx = 0, fy = 0,
                          interpolation = cv2.INTER_CUBIC)




if __name__ == "__main__":
  main()