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
