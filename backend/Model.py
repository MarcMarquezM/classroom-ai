# Computer Vision
import cv2 as cv
import face_recognition as face_rec
# Object Detection
from ultralytics import YOLO
# Numeric Processing
import numpy as np
from torch import Tensor
# ID's
from uuid import uuid4
# Redis
import redis
# Detections
from Detection import Detection
# logging
import logging


class Model:
    CONFIDENCE_THRESHOLD: float = 0.60
    ARM_RAISE_DURATION_THRESHOLD: int = 20
    LOST_THRESHOLD: int = 5

    def __init__(self, course_id, session_count):
        self.redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
        self.namespace: str = f'course:{course_id}:session:{session_count}'
        # Images of all the students in the class
        self.student_images: dict[str, np.ndarray] = {}
        # Date of the session
        self.date: any = None
        # Check if we no longer need to check for student's assistance
        self.finished_assistance: bool = False
        # Load model
        self.yolo_model: YOLO = YOLO('models/yolov8s-pose.pt')
        # Pose and bounding box detections for the current frame
        self.model_detections: dict[str, None | Tensor] = {'poses': None, 'boxes': None}
        # Arm raised detections
        self.active_detections: dict[str, Detection] = {}
        # Counter of the current frame of the video
        self.frame_count: int = 0
        # Container
        self.frame_container: list[np.ndarray] = []

    ''' DATA MANAGEMENT '''

    def save_data(self, students_info: dict[str, dict]) -> None:
        """
        Saves student information to the Redis database and in a local dictionary.

        This method iterates through the provided student information dictionary, storing each
        student's data in the Redis database under a unique namespace key. Images are stored
        separately in a local dictionary for efficiency.

        Args:
            students_info (dict[str, dict]): A dictionary containing student IDs as keys and
                their corresponding information (excluding images) as values.

        Returns:
            None
        """

        for student_id, student_info in students_info.items():
            # Save students info to Redis DB
            namespace_key = f'{self.namespace}:student:{student_id}'

            # Iterate through each field in student info
            for key, value in student_info.items():
                if key != 'img':  # Exclude the image from data to be saved in Redis
                    # Convert boolean to a string or integer for Redis compatibility
                    if isinstance(value, bool):
                        value = 'true' if value else 'false'
                    else:
                        value = str(value)

                    # Update the specific field in the hash
                    self.redis_client.hset(namespace_key, key, value)

            # Save student image to the local dictionary
            if 'img' in student_info:
                self.student_images[str(student_id)] = student_info['img']

    def delete_all_data(self) -> None:
        """
        Deletes all student-related data from the Redis database for the current namespace.

        This method searches for and deletes all Redis keys that match the current namespace pattern,
        effectively removing all data related to the current course session.

        Returns:
            None
        """

        namespace_pattern = f'{self.namespace}:*'
        for key in self.redis_client.scan_iter(namespace_pattern):
            self.redis_client.delete(key)

    def update_field(self, student_id: str, field: str, new_value: any) -> None:
        """
        Updates a specific field in a student's information in the Redis database.

        This method locates a student's record in Redis using their ID and updates a specified field
        with a new value. It handles data type conversion for Redis storage.

        Args:
            student_id (str): The unique identifier of the student.
            field (str): The name of the field to update.
            new_value (any): The new value to assign to the field. Boolean values are converted to strings.

        Returns:
            None
        """

        namespace_key = f'{self.namespace}:student:{student_id}'

        if isinstance(new_value, bool):
            # Convert boolean to 'true' or 'false' string
            value = 'true' if new_value else 'false'
            self.redis_client.hset(namespace_key, field, value)
        elif isinstance(new_value, int) and new_value > 0:
            # Increment the integer field
            self.redis_client.hincrby(namespace_key, field, new_value)
        elif isinstance(new_value, int) and new_value == 0:
            # Reset the numeric value
            self.redis_client.hset(namespace_key, field, str(new_value))
        else:
            logging.error('Error setting the new value, make sure it\'s valid')

    def get_field(self, student_id: str, field: str) -> any:
        """
        Retrieves the value of a specified field from a student's information in Redis.

        This method fetches a specific field from a student's record in Redis and returns it,
        converting the data back to its original type if necessary.

        Args:
            student_id (str): The unique identifier of the student.
            field (str): The name of the field to retrieve.

        Returns:
            any: The value of the requested field, converted to the appropriate data type.
        """

        namespace_key = f'{self.namespace}:student:{student_id}'
        value = self.redis_client.hget(namespace_key, field)

        if value is not None:
            if value.isdigit():
                return int(value)  # Convert string to integer
            elif value in ['true', 'false']:
                return value == 'true'  # Convert string to boolean
            else:
                return value  # Return string as is
        return None

    def get_student_info(self, student_id: str) -> dict:
        """
        Retrieves all available information for a specific student from Redis.

        This method fetches the entire record for a given student from Redis and returns it as a dictionary.
        Data types are converted back to their original types where necessary.

        Args:
            student_id (str): The unique identifier of the student.

        Returns:
            dict: A dictionary containing all available information for the specified student.
        """

        namespace_key = f'{self.namespace}:student:{student_id}'
        student_info = self.redis_client.hgetall(namespace_key)

        # Convert fields from string to their appropriate data types
        for key, value in student_info.items():
            if value.isdigit():
                student_info[key] = int(value)  # Convert to integer
            elif value in ['true', 'false']:
                student_info[key] = value == 'true'  # Convert to boolean

        return student_info

    def get_all_students_info(self) -> dict:
        """
        Retrieves information for all students associated with the current session from Redis.

        This method scans Redis for all keys related to students in the current namespace and compiles
        their information into a dictionary.

        Returns:
            dict: A dictionary with student IDs as keys and dictionaries of their information as values.
        """

        students_data = {}
        student_pattern = f'{self.namespace}:student:*'
        for key in self.redis_client.scan_iter(student_pattern):
            # Extracting student_id from the key
            student_id = key.split(':')[-1]
            student_info = self.redis_client.hgetall(key)

            # Convert fields from string to their appropriate data types
            processed_info = {}
            for field, value in student_info.items():
                if value.isdigit():
                    processed_info[field] = int(value)  # Convert to integer
                elif value in ['true', 'false']:
                    processed_info[field] = value == 'true'  # Convert to boolean
                else:
                    processed_info[field] = value  # Keep as string

            students_data[student_id] = processed_info

        return students_data

    ''' ASSISTANCE CHECKER '''

    def check_assistance(self) -> bool:
        """
        Checks if all students have marked their assistance for the current session.

        This method goes through the assistance status of all students for the current session and determines
        if every student has been marked as present.

        Returns:
            bool: True if all students are marked present, False otherwise.
        """

        students_info = self.get_all_students_info()
        for student_info in students_info.values():
            if not student_info['assistance']:
                return False
        return True

    ''' POSE AND PARTICIPATION DETECTION '''

    @staticmethod
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

    def get_keypoint(self, keypoint: list) -> tuple:
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

        return (int(keypoint[0]), int(keypoint[1])) if float(keypoint[2]) > self.CONFIDENCE_THRESHOLD else (None, None)

    @staticmethod
    def get_elbow_vertex_angle(x1: int, y1: int, x2: int, y2: int) -> float:
        """
        Calculates the angle at the elbow vertex formed by two vectors in a 2D plane.

        This function computes the angle based on the coordinates of two vectors. These vectors
        are typically representing the upper arm and the forearm in the context of an arm pose.
        The angle is calculated using the dot product and the magnitudes of these vectors,
        and it's returned in degrees.

        Parameters:
            x1 (int): The x component of the first vector (shoulder to elbow)
            y1 (int): The y component of the first vector (shoulder to elbow)
            x2 (int): The x component of the second vector (from elbow to wrist).
            y2 (int): The y component of the second vector (from elbow to wrist).

        Returns:
            float: The angle in degrees at the elbow vertex. The angle is between 0 and 180 degrees.
        """

        # Calculate the dot product
        dot_product = x1 * x2 + y1 * y2

        # Calculate the magnitudes of the vectors
        magnitude1 = np.sqrt(x1 ** 2 + y1 ** 2)
        magnitude2 = np.sqrt(x2 ** 2 + y2 ** 2)

        # Use the arc cosine function to find the angle in radians
        angle_rad = np.arccos(dot_product / (magnitude1 * magnitude2))

        # Convert the angle to degrees
        return np.degrees(angle_rad)

    @staticmethod
    def get_shoulder_vertex_angle(shoulder: tuple, wrist: tuple) -> float:
        """
        Calculates the angle at the shoulder vertex formed by a line segment and the horizontal axis.

        This function computes the angle based on the coordinates of the shoulder and the wrist.
        The angle is calculated with respect to the horizontal axis, using the arc-tangent function,
        and it's returned in degrees. This angle can be used to determine the orientation of the arm.

        Parameters:
            shoulder (tuple): A tuple (x, y) representing the coordinates of the shoulder joint.
            wrist (tuple): A tuple (x, y) representing the coordinates of the wrist joint.

        Returns:
            float: The angle in degrees at the shoulder vertex. The angle is between -180 and 180 degrees,
                where positive values indicate an angle measured counterclockwise from the horizontal axis.
        """

        x_shoulder, y_shoulder = shoulder
        x_wrist, y_wrist = wrist
        angle = np.arctan2(x_wrist - x_shoulder, y_shoulder - y_wrist)
        return np.degrees(angle)

    def is_arm_raised(self, arm: dict, face_center: tuple, arm_side: str) -> bool:
        """
        Determines whether an arm is raised based on the keypoints of the arm and their relative angles.

        This function checks if the arm (either left or right) is raised by analyzing the positions
        and angles formed by the shoulder, elbow, and wrist keypoints. It calculates the angles at the
        elbow and shoulder and applies specific conditions to determine if the arm is in a raised position.

        The function first checks if all keypoints are available (not None). It then calculates the
        angle at the elbow (using the elbow as the vertex) and the angle at the shoulder (with respect
        to the horizontal axis). Based on these angles and the relative positions of the keypoints,
        it determines if the arm is raised. The criteria for an arm being raised include the angles
        being within specific ranges and the wrist being positioned higher than the elbow.

        Parameters:
            arm (dict): A dictionary containing keypoints for the arm. Each keypoint is a tuple of coordinates (x, y).
                Expected keys are 'shoulder', 'elbow', and 'wrist'.
            face_center (tuple): The keypoint of the center of the person's face
            arm_side (str): A string indicating the side of the arm ('left' or 'right').

        Returns:
            bool: True if the arm is determined to be raised, False otherwise.
        """

        if all(coord is not None for point in arm.values() for coord in point):
            # Get key point vectors
            vector1_x = arm['elbow'][0] - arm['shoulder'][0]
            vector1_y = arm['elbow'][1] - arm['shoulder'][1]
            vector2_x = arm['wrist'][0] - arm['elbow'][0]
            vector2_y = arm['wrist'][1] - arm['elbow'][1]

            # Get angles
            elbow_vertex_angle = self.get_elbow_vertex_angle(vector1_x, vector1_y, vector2_x, vector2_y)
            shoulder_vertex_angle = self.get_shoulder_vertex_angle(arm['shoulder'], arm['wrist'])

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

    def face_rec_scan(self, curr_frame: np.ndarray, curr_detection: Detection) -> tuple:
        """
        Performs facial recognition within a specified bounding box of the current frame.

        The function first crops the frame based on the bounding box coordinates. It then detects faces within
        this cropped area and compares these faces against known student faces in `students_images`. If a match
        is found, the function updates the student's assistance status and participation counter in the Redis DB.

        Parameters:
            curr_frame (np.ndarray): The current video frame as a NumPy array.
            curr_detection (Detection): An object containing the information of the student

        Returns:
            tuple: For the first value - True if a face within the bounding box matches a known student face, False otherwise.
                For the second value - True if the face is not part of the `students_images`, False otherwise.
        """

        # Get the person's bounding box
        box_x_min, box_y_min, box_x_max, box_y_max = curr_detection.bbox
        # Crop the frame to only get the frame inside the bounding box
        cropped_frame = curr_frame[box_y_min:box_y_max, box_x_min:box_x_max]
        # Convert the image from BGR color (which OpenCV uses) to RGB color (which face_recognition uses)
        cropped_frame = cv.cvtColor(cropped_frame, cv.COLOR_BGR2RGB)
        # Find all the faces and face encodings in the current frame of video
        face_locations = face_rec.face_locations(cropped_frame)
        # Detected face encoding
        face_enc = None

        if curr_detection.face_center == (None, None) or len(face_locations) == 0:
            # No face key points found or the face is not found
            return False, False

        for face_location in face_locations:
            # Get the face's bounding box
            top = face_location[0] + box_y_min
            right = face_location[1] + box_x_min
            bottom = face_location[2] + box_y_min
            left = face_location[3] + box_x_min
            # Check if we detected the correct face
            if left <= curr_detection.face_center[0] <= right and top <= curr_detection.face_center[1] <= bottom:
                logging.info('Detection - Correct face detected')
                # The argument known_face_locations must be a list, but considering
                # we are only checking one face, we wrap the `face_location` in a list
                # and only get the first index to get the encoding out of the outer list
                face_enc = face_rec.face_encodings(cropped_frame, [face_location])[0]
                break

        # We iterate over each student in the course to compare with their faces
        if face_enc is not None:
            for student_id, student_img in self.student_images.items():
                # Check if the current student's image is the same from the `face_enc`
                match = face_rec.compare_faces([student_img], face_enc)[0]
                # Check if it's a match
                if match:
                    student_name = self.get_field(student_id, 'name')
                    logging.info(f'Student {student_name} has participated')
                    # Student found, update assistance and participation
                    self.update_field(student_id, 'assistance', True)
                    self.update_field(student_id, 'participation_counter', 1)
                    return True, False
            # Even though we got the face of the person that raised their arm, we got no matches
            # from the list of students in the course, therefore, this person is not a student
            logging.info('Got no matches from list of students, therefore, this person is not a student')
            return False, True

        # No match found
        logging.info('No match found, scanning again on the next frame')
        return False, False

    # TODO: Add color detection to make sure we get the right person
    def check_for_detection(self, bbox: tuple) -> tuple:
        """
        Checks whether a person represented by the given bounding box (bbox) is already being tracked
        in the system's active detections.

        This method iterates through all active detections and compares the provided bounding box
        with each detection's bounding box center. If the center of an active detection falls within
        the provided bounding box, it is considered that the person is already being tracked,
        and their existing UUID is returned along with a flag indicating it's not a new detection.

        If no existing detection is found for the provided bounding box, a new UUID is generated,
        signifying a new detection, and returned with a flag indicating it's a new detection.

        Args:
            bbox (tuple): A tuple representing the bounding box of a person, typically in the format
                (x_min, y_min, x_max, y_max).

        Returns:
            tuple: A tuple containing the UUID of the detection (new or existing) and a boolean
                flag indicating whether it's a new detection (True) or an existing one (False).
        """

        for curr_uuid, curr_detection in self.active_detections.items():
            if bbox[0] <= curr_detection.bbox_center[0] <= bbox[2] and bbox[1] <= curr_detection.bbox_center[1] <= bbox[3]:
                # This person has an existing detection
                return curr_uuid, False
        # This is a new detection
        new_uuid = str(uuid4())
        return new_uuid, True

    @staticmethod
    def update_detection(curr_detection: Detection, bbox: tuple, bbox_center: tuple, face_center: tuple, curr_frame_count: int) -> None:
        """
        Updates the attributes of a given Detection object with new bounding box, bounding box center,
        face center, and the frame count at which the detection was last updated.

        This method is a utility function to streamline the process of updating a Detection object with
        new information as it becomes available in each frame of the video.

        Args:
            curr_detection (Detection): The Detection object to be updated.
            bbox (tuple): A tuple representing the bounding box of the detected person, typically in
                the format (x_min, y_min, x_max, y_max).
            bbox_center (tuple): A tuple representing the center point of the bounding box,
                typically in the format (center_x, center_y).
            face_center (tuple): A tuple representing the center point of the detected face,
                typically in the format (center_x, center_y).
            curr_frame_count (int): The current frame count at the time of detection update.

        Returns:
            None: The method updates the attributes of the provided Detection object in-place
                and does not return anything.
        """

        curr_detection.bbox = bbox
        curr_detection.bbox_center = bbox_center
        curr_detection.face_center = face_center
        curr_detection.last_frame_detected = curr_frame_count

    def iterate_over_detections(self, frame: np.ndarray) -> None:
        """
        Iterates over all detected poses and bounding boxes in a given frame, processes each detection,
        and updates or creates new detection instances as needed.

        This method is responsible for analyzing each detected person in the frame, determining if their arms are raised,
        and managing the detection lifecycle including creation, update, and completion of detections.

        Args:
            frame (np.ndarray): The current frame from the video feed as a NumPy array.

        Process:
            - For each detected person, extracts pose keypoints (e.g., face, left arm, right arm).
            - Calculates the bounding box and its center, as well as the center of the face.
            - Determines whether the left or right arm is raised.
            - Checks for an existing detection or creates a new one.
            - Updates existing detection information or increments the detection counter.
            - Initiates face recognition process if the arm has been raised for the defined threshold duration.

        Note:
            This method updates the state of active detections and logs significant events but does not return any value.

        Returns:
            None
        """

        if self.model_detections['poses'].numel() > 0 and self.model_detections['boxes'].numel() > 0:
            # If the number of poses and bounding boxes are more than 0, it means we have detections
            for index, pose in enumerate(self.model_detections['poses']):  # Iterate per person detected
                # Get the current pose of the iterated person
                face: dict[str, tuple] = {
                    'nose': self.get_keypoint(pose[0]),
                    'left_eye': self.get_keypoint(pose[1]),
                    'right_eye': self.get_keypoint(pose[2]),
                    'left_ear': self.get_keypoint(pose[3]),
                    'right_ear': self.get_keypoint(pose[4])
                }

                left_arm: dict[str, tuple] = {
                    'shoulder': self.get_keypoint(pose[5]),
                    'elbow': self.get_keypoint(pose[7]),
                    'wrist': self.get_keypoint(pose[9])
                }

                right_arm: dict[str, tuple] = {
                    'shoulder': self.get_keypoint(pose[6]),
                    'elbow': self.get_keypoint(pose[8]),
                    'wrist': self.get_keypoint(pose[10])
                }

                # Get the person's bounding box
                curr_bbox = self.model_detections['boxes'][index]
                # x_min, y_min, x_max, y_max
                bounding_box: tuple[int, int, int, int] = int(curr_bbox[0]), int(curr_bbox[1]), int(curr_bbox[2]), int(curr_bbox[3])
                # Get bounding box center point
                bbox_center_point: tuple[int, int] = ((bounding_box[0] + bounding_box[2]) // 2, (bounding_box[1] + bounding_box[3]) // 2)

                # Get the person's face center point
                face_center_point: tuple = self.get_face_center(face)

                # Now that we have the person's pose and bounding box, we now check if their arms are raised
                left_arm_raised: bool = self.is_arm_raised(left_arm, face_center_point, 'left')
                right_arm_raised: bool = self.is_arm_raised(right_arm, face_center_point, 'right')

                # Get the person's current detection
                uuid, new_detection = self.check_for_detection(bounding_box)

                # Check if the left or right are is raised, only one arm must be raised
                if left_arm_raised != right_arm_raised:
                    # Either arm is raised

                    # Check if it's not a new detection
                    if new_detection:
                        self.active_detections[uuid] = Detection(bounding_box, bbox_center_point, face_center_point, self.frame_count)
                    else:
                        # Get the person's info
                        detection = self.active_detections[uuid]
                        # Update new info
                        self.update_detection(detection, bounding_box, bbox_center_point, face_center_point, self.frame_count)
                        # Check if arm has been raised for 20 straight frames
                        if detection.arm_raised_counter >= self.ARM_RAISE_DURATION_THRESHOLD and not detection.face_scanned and not detection.not_a_student:
                            # Person has raised the arm for the correct amount of frames, run facial recognition and update new info
                            logging.info(f'Detection {uuid} - Getting face recognition')
                            scanned, not_a_student = self.face_rec_scan(frame, detection)
                            detection.face_scanned = scanned
                            detection.not_a_student = not_a_student

                        elif detection.arm_raised_counter < self.ARM_RAISE_DURATION_THRESHOLD and not detection.face_scanned:
                            # Increment counter
                            detection.arm_raised_counter += 1

                # Arm is not raised
                else:
                    if not new_detection:
                        # Get the person's info
                        detection = self.active_detections[uuid]
                        # Check if the detection is complete
                        if not detection.detection_completed and detection.arm_raised_counter >= self.ARM_RAISE_DURATION_THRESHOLD:
                            # Update new info
                            self.update_detection(detection, bounding_box, bbox_center_point, face_center_point, self.frame_count)
                            # They have raised their arm for the correct duration, but their detection has not been completed
                            if detection.face_scanned or detection.not_a_student:
                                # Face has been scanned or the person is not a student, the detection has been completed
                                detection.detection_completed = True
                            else:
                                # Face has yet to be scanned
                                logging.info(f'Detection {uuid} - Getting face recognition')
                                scanned, not_a_student = self.face_rec_scan(frame, detection)
                                detection.face_scanned = scanned
                                detection.not_a_student = not_a_student

    def cleanup(self) -> None:
        """
        Cleans up the active detections by removing entries that are either completed, identified as non-students,
        or have been inactive for a duration beyond the defined threshold.

        This method iterates through all active detections and applies the following checks:
            * If a detection is marked as completed and identified as not a student, it is removed.
            * If a detection is simply marked as completed (implying a successful identification), it is also removed.
            * If a detection has not been updated for a period longer than the defined lost threshold (indicating the person
            has been absent from the frame for too long), it is removed.

        This cleanup helps in maintaining an up-to-date list of active detections, ensuring the system's performance
        and accuracy.

        Returns:
            None
        """

        for uuid, detection in list(self.active_detections.items()):
            # Check if the detected person is not a student
            if detection.detection_completed and detection.not_a_student:
                del self.active_detections[uuid]
                logging.info(f'Detection {uuid} is not a student, deleting detection.')

            # Check if the detected person has completed their detection
            elif detection.detection_completed:
                del self.active_detections[uuid]
                logging.info(f'Detection {uuid} completed, deleting detection.')

            # Check if the detected person has been absent for too long
            elif self.frame_count - detection.last_frame_detected > self.LOST_THRESHOLD:
                del self.active_detections[uuid]
                logging.warning(f'Detection {uuid} removed due to prolonged absence.')
