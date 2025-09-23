import cv2 as cv
from uuid import uuid4
from ultralytics import YOLO
from torch import Tensor
import numpy as np
import face_recognition as face_rec
import logging

logging.basicConfig(level=logging.INFO)

"""
NOSE:           0
LEFT_EYE:       1
RIGHT_EYE:      2
LEFT_EAR:       3
RIGHT_EAR:      4
LEFT_SHOULDER:  5
RIGHT_SHOULDER: 6
LEFT_ELBOW:     7
RIGHT_ELBOW:    8
LEFT_WRIST:     9
RIGHT_WRIST:    10
"""


class Detection:
    def __init__(self, bbox: tuple, bbox_center: tuple, face_center: tuple, last_frame_detected: int):
        self.bbox = bbox  # Students bounding box
        self.bbox_center = bbox_center  # Students bounding box center point
        self.face_center = face_center  # Students face center point
        self.last_frame_detected = last_frame_detected  # Last frame detected in case of lost tracker (redundancy)
        # self.shirt_color = shirt_color  # To be able to also track the person with the color of their shirt
        self.arm_raised_counter = 1  # Count of number of frames with arm raised
        self.face_scanned = False  # Check if the student has been scanned successfully
        self.detection_completed = False  # Check if the detection can be deleted
        self.not_a_student = False  # Check if the person detected is not a student


# Constants
CONFIDENCE_THRESHOLD: float = 0.60
ARM_RAISE_DURATION_THRESHOLD: int = 20
LOST_THRESHOLD: int = 5
GREEN: tuple = (0, 255, 0)
RED: tuple = (0, 0, 255)

# Load model
model = YOLO('../models/yolov8s-pose.pt')

# Pose and bounding box detections for the current frame
model_detections: dict[str, None | Tensor] = {'poses': None, 'boxes': None}
# Arm raised detections
active_detections: dict[str, Detection] = {}
# Counter of the current frame of the video
frame_count: int = 0


def get_face_center(face_coords: dict) -> tuple:
    """
    Calculates the center coordinates of a face based on the given facial keypoints.

    Args:
        face_coords (dict): A dictionary containing facial keypoints with keys representing
            the name of the keypoints and values as (x, y) coordinates.

    Returns:
        tuple: A tuple containing the (x, y) coordinates of the calculated face center.
            If the input is invalid or no valid keypoints are found, returns (None, None).
    """
    total_x, total_y, count = 0, 0, 0

    for key, point in face_coords.items():
        # Check if the keypoint is valid
        if point[0] is not None and point[1] is not None:
            total_x += point[0]
            total_y += point[1]
            count += 1

    # Avoid division by zero
    if count == 0:
        return None, None

    # Calculate the average x and y coordinates
    center_x = total_x // count
    center_y = total_y // count

    return center_x, center_y


# Get the keypoint of a part of a pose
def get_keypoint(keypoint: list) -> tuple:
    """
    Extracts the (x, y) coordinates from a keypoint if the confidence level exceeds the threshold.

    This method takes a keypoint, which is expected to be a list containing the x-coordinate,
    y-coordinate, and confidence level. If the confidence level is greater than the defined
    CONFIDENCE_THRESHOLD, the method returns the (x, y) coordinates. Otherwise, it returns (None, None).

    Parameters:
        keypoint (list): A list where the first two elements are x and y coordinates, and the third element
            is the confidence level. Typically: [x, y, confidence].

    Returns:
        tuple: A tuple of (x, y) if the confidence level is above the threshold, otherwise (None, None).
    """
    return (int(keypoint[0]), int(keypoint[1])) if float(keypoint[2]) > CONFIDENCE_THRESHOLD else (None, None)


# Get the angle of the arm with the elbow as the vertex
def get_elbow_vertex_angle(x1: int, y1: int, x2: int, y2: int) -> float:
    # Calculate the dot product
    dot_product = x1 * x2 + y1 * y2

    # Calculate the magnitudes of the vectors
    magnitude1 = np.sqrt(x1 ** 2 + y1 ** 2)
    magnitude2 = np.sqrt(x2 ** 2 + y2 ** 2)

    # Use the arc cosine function to find the angle in radians
    angle_rad = np.arccos(dot_product / (magnitude1 * magnitude2))

    # Convert the angle to degrees
    return np.degrees(angle_rad)


# Get the angle of the arm with the shoulder as the vertex
def get_shoulder_vertex_angle(shoulder: tuple, wrist: tuple) -> float:
    x_shoulder, y_shoulder = shoulder
    x_wrist, y_wrist = wrist
    angle = np.arctan2(x_wrist - x_shoulder, y_shoulder - y_wrist)
    return np.degrees(angle)


def is_arm_raised(arm: dict, face_center: tuple, arm_side: str) -> bool:
    if all(coord is not None for point in arm.values() for coord in point):
        # Get key point vectors
        vector1_x = arm['elbow'][0] - arm['shoulder'][0]
        vector1_y = arm['elbow'][1] - arm['shoulder'][1]
        vector2_x = arm['wrist'][0] - arm['elbow'][0]
        vector2_y = arm['wrist'][1] - arm['elbow'][1]

        # Get angles
        elbow_vertex_angle = get_elbow_vertex_angle(vector1_x, vector1_y, vector2_x, vector2_y)
        shoulder_vertex_angle = get_shoulder_vertex_angle(arm['shoulder'], arm['wrist'])

        # The angle must be between 0 - 130
        accepted_angles = 0 <= elbow_vertex_angle <= 130
        # The wrist y coord must not be lower than the elbow y coord
        wrist_over_shoulder = arm['wrist'][1] < arm['elbow'][1]
        # The shoulder y coord must be higher than the elbow y coord which must be lower than the wrist
        lower_bent_arm = arm['shoulder'][1] < arm['elbow'][1] > arm['wrist'][1]
        # THe shoulder y coord must be lower than the elbow y coord which must be lower than the wrist
        upper_bent_arm = arm['shoulder'][1] > arm['elbow'][1] > arm['wrist'][1]
        # The wrist must be above the face center point
        wrist_over_face = arm['wrist'][1] < face_center[1] if (face_center[0], face_center[1]) != (None, None) else False

        if arm_side == 'left':
            # The wrist x coord must not be to the left of the shoulder's x coord with an angle bigger than 70
            wrist_over_head = not (arm['wrist'][0] < arm['shoulder'][0] and elbow_vertex_angle >= 70)
            # The wrist x coord must not be to the left of the elbow's x coord which must not be to the left of the shoulder's x coord with and
            wrist_elbow_side_of_shoulder = not (arm['wrist'][0] < arm['elbow'][0] < arm['shoulder'][0] and elbow_vertex_angle >= 50)
            angled_outside_arm = arm['shoulder'][0] < arm['elbow'][0] < arm['wrist'][0]
            diagonal_arm = ((angled_outside_arm and shoulder_vertex_angle <= 60) or
                            (lower_bent_arm and shoulder_vertex_angle <= 70) or
                            (upper_bent_arm and shoulder_vertex_angle <= 50))
            if (diagonal_arm and
                    accepted_angles and
                    wrist_over_shoulder and
                    wrist_over_head and
                    wrist_elbow_side_of_shoulder and
                    shoulder_vertex_angle <= 100 and
                    wrist_over_face):
                return True

        elif arm_side == 'right':
            # The wrist x coord must not be to the right of the shoulder's x coord with an angle bigger than 70
            wrist_over_head = not (arm['wrist'][0] > arm['shoulder'][0] and elbow_vertex_angle >= 70)
            # The wrist x coord must not be to the left of the elbow's x coord which must not be to the left of the shoulder's x coord with and
            wrist_elbow_side_of_shoulder = not (arm['wrist'][0] > arm['elbow'][0] > arm['shoulder'][0] and elbow_vertex_angle >= 50)
            angled_outside_arm = arm['shoulder'][0] > arm['elbow'][0] > arm['wrist'][0]
            diagonal_arm = ((angled_outside_arm and shoulder_vertex_angle >= -60) or
                            (lower_bent_arm and shoulder_vertex_angle >= -70) or
                            (upper_bent_arm and shoulder_vertex_angle >= -50))
            if (diagonal_arm and
                    accepted_angles and
                    wrist_over_shoulder and
                    wrist_over_head and
                    wrist_elbow_side_of_shoulder and
                    shoulder_vertex_angle >= -100 and
                    wrist_over_face):
                return True
    return False


def face_rec_scan(curr_frame: np.ndarray, curr_detection: Detection) -> tuple:
    """
    PROTOTYPE
    Since we don't have the student's faces, we don't check which student it is.
    We return true if the face detected is the one from the correct pose
    the value not_a_student will not work here, so we always return false
    """

    # Get the person's bounding box
    box_x_min, box_y_min, box_x_max, box_y_max = curr_detection.bbox
    # Crop the frame to only get the frame inside the bounding box
    cropped_frame = curr_frame[box_y_min:box_y_max, box_x_min:box_x_max]
    # Convert the image from BGR color (which OpenCV uses) to RGB color (which face_recognition uses)
    cropped_frame = cv.cvtColor(cropped_frame, cv.COLOR_BGR2RGB)
    # Find all the faces and face encodings in the current frame of video
    face_locations = face_rec.face_locations(cropped_frame)

    if curr_detection.face_center == (None, None) or len(face_locations) == 0:
        # No face key points found or the face is not found
        return False, False

    for face_location in face_locations:
        top = face_location[0] + box_y_min
        right = face_location[1] + box_x_min
        bottom = face_location[2] + box_y_min
        left = face_location[3] + box_x_min
        if left <= curr_detection.face_center[0] <= right and top <= curr_detection.face_center[1] <= bottom:
            logging.info('Detection - Correct face detected')
            cv.rectangle(curr_frame, (left, bottom), (right, top), RED, 2)
            # Detected the correct face
            return True, False

    # No match found
    return False, False


def check_for_detection(bbox: tuple) -> tuple:
    # Iterate over the existing arm raised detections and check if this person is being tracked
    for curr_uuid, curr_detection in active_detections.items():
        if bbox[0] <= curr_detection.bbox_center[0] <= bbox[2] and bbox[1] <= curr_detection.bbox_center[1] <= bbox[3]:
            # This person has an existing detection
            return curr_uuid, False
    # This is a new detection
    new_uuid = str(uuid4())
    return new_uuid, True


def update_detection(curr_detection: Detection, bbox: tuple, bbox_center: tuple, face_center: tuple, curr_frame_count: int):
    curr_detection.bbox = bbox
    curr_detection.bbox_center = bbox_center
    curr_detection.face_center = face_center
    curr_detection.last_frame_detected = curr_frame_count


# Get video
cap = cv.VideoCapture(2)
while True:
    ret, frame = cap.read()
    if not ret:
        break

    # Add to frame counter
    frame_count += 1

    # Get all the poses and bounding box in the current frame
    results = model(frame, verbose=False)[0]

    # We only want to get the arms and shoulders of the pose
    model_detections['poses'] = results.keypoints.data[:, 0:11, :]
    model_detections['boxes'] = results.boxes.data

    # Iterate over poses
    if model_detections['poses'].numel() > 0 and model_detections['boxes'].numel() > 0:
        # If the number of poses and bounding boxes are more than 0, it means we have detections
        for index, pose in enumerate(model_detections['poses']):  # Iterate per person detected
            # Iterate over each pose
            for kp in pose:  # Draw key points
                x, y, conf = int(kp[0]), int(kp[1]), float(kp[2])
                if conf > CONFIDENCE_THRESHOLD:
                    cv.circle(frame, (x, y), 5, GREEN, cv.FILLED)

            # Get the current pose of the iterated person
            face: dict[str, tuple] = {
                'nose': get_keypoint(pose[0]),
                'left_eye': get_keypoint(pose[1]),
                'right_eye': get_keypoint(pose[2]),
                'left_ear': get_keypoint(pose[3]),
                'right_ear': get_keypoint(pose[4])
            }

            left_arm: dict[str, tuple] = {
                'shoulder': get_keypoint(pose[5]),
                'elbow': get_keypoint(pose[7]),
                'wrist': get_keypoint(pose[9])
            }

            right_arm: dict[str, tuple] = {
                'shoulder': get_keypoint(pose[6]),
                'elbow': get_keypoint(pose[8]),
                'wrist': get_keypoint(pose[10])
            }

            # Get the person's bounding box
            curr_bbox = model_detections['boxes'][index]
            # x_min, y_min, x_max, y_max
            bounding_box: tuple[int, int, int, int] = int(curr_bbox[0]), int(curr_bbox[1]), int(curr_bbox[2]), int(curr_bbox[3])
            # Get bounding box center point
            bbox_center_point: tuple[int, int] = ((bounding_box[0] + bounding_box[2]) // 2, (bounding_box[1] + bounding_box[3]) // 2)

            # Get the person's face center point
            face_center_point: tuple = get_face_center(face)

            # Now that we have the person's pose and bounding box, we now check if their arms are raised
            left_arm_raised: bool = is_arm_raised(left_arm, face_center_point, 'left')
            right_arm_raised: bool = is_arm_raised(right_arm, face_center_point, 'right')

            # Get the person's current detection
            uuid, new_detection = check_for_detection(bounding_box)

            # Check if the left or right are is raised, only one arm must be raised
            if left_arm_raised != right_arm_raised:
                # Either arm is raised

                # Check if it's not a new detection
                if new_detection:
                    active_detections[uuid] = Detection(bounding_box, bbox_center_point, face_center_point, frame_count)
                else:
                    # Get the person's info
                    detection = active_detections[uuid]
                    # Update new info
                    update_detection(detection, bounding_box, bbox_center_point, face_center_point, frame_count)
                    # Check if arm has been raised for 20 straight frames
                    if detection.arm_raised_counter >= ARM_RAISE_DURATION_THRESHOLD and not detection.face_scanned:
                        # Person has raised the arm for the correct amount of frames, run facial recognition and update new info
                        logging.info(f'Detection {uuid} - Getting face recognition')
                        scanned, not_a_student = face_rec_scan(frame, detection)
                        detection.face_scanned = scanned
                        detection.not_a_student = not_a_student

                    elif detection.arm_raised_counter < ARM_RAISE_DURATION_THRESHOLD and not detection.face_scanned:
                        # Increment counter
                        detection.arm_raised_counter += 1

            # Arm is not raised
            else:
                if not new_detection:
                    # Get the person's info
                    detection = active_detections[uuid]
                    # Check if the detection is complete
                    if not detection.detection_completed and detection.arm_raised_counter >= ARM_RAISE_DURATION_THRESHOLD:
                        # Update new info
                        update_detection(detection, bounding_box, bbox_center_point, face_center_point, frame_count)
                        # They have raised their arm for the correct duration, but their detection has not been completed
                        if detection.face_scanned:
                            # Face has been scanned, the detection has been completed
                            detection.detection_completed = True
                        else:
                            # Face has yet to be scanned
                            logging.info(f'Detection {uuid} - Getting face recognition')
                            scanned, not_a_student = face_rec_scan(frame, detection)
                            detection.face_scanned = scanned
                            detection.not_a_student = not_a_student

            # Show bounding box to image
            cv.rectangle(frame, (bounding_box[0], bounding_box[1]), (bounding_box[2], bounding_box[3]), GREEN, 2)
            text_to_show = f'Counter: {active_detections[uuid].arm_raised_counter if uuid in active_detections else 0}, ' \
                           f'Scanned: {active_detections[uuid].face_scanned if uuid in active_detections else False}'
            # Show counter to image
            cv.putText(
                frame,
                text_to_show,
                (bounding_box[0], bounding_box[1] - 5),
                cv.FONT_HERSHEY_SIMPLEX,
                0.5,
                GREEN,
                2
            )

        # Cleanup of active detections
        for uuid, detection in list(active_detections.items()):
            # Check if the detected person is not a student
            if detection.detection_completed and detection.not_a_student:
                del active_detections[uuid]
                logging.info(f'Detection {uuid} is not a student, deleting detection.')

            # Check if the detected person has completed their detection
            elif detection.detection_completed:
                del active_detections[uuid]
                logging.info(f'Detection {uuid} completed, deleting detection.')

            # Check if the detected person has been absent for too long
            elif frame_count - detection.last_frame_detected > LOST_THRESHOLD:
                del active_detections[uuid]
                logging.warning(f'Detection {uuid} removed due to prolonged absence.')

    # Display
    cv.imshow('Pose Estimation', frame)

    # Break on ESC
    if cv.waitKey(1) == ord("q"):
        break

# Cleanup
cap.release()
cv.destroyAllWindows()
