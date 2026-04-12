<?php
session_start();
include("connection.php");

if (!isset($_SESSION['tcode'])) {
    header("location:sign.php");
    exit();
}

$tcode = mysqli_real_escape_string($conn, $_SESSION['tcode']);
$teacher_query = mysqli_query($conn, "SELECT * FROM teacher WHERE tcode='$tcode'");

if (!$teacher_query || mysqli_num_rows($teacher_query) == 0) {
    header("location:sign.php");
    exit();
}

$teacher = mysqli_fetch_assoc($teacher_query);
$tid = $teacher['tid'];

// Get classes for dropdown from permission table
$classes_query = mysqli_query($conn, "
    SELECT DISTINCT c.cid, c.class_name, c.class_code 
    FROM permision p
    INNER JOIN class c ON p.cid = c.cid
    WHERE p.tid = '$tid'
    ORDER BY c.class_name
");

if (!$classes_query) {
    die("Query failed: " . mysqli_error($conn));
}

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $cid = mysqli_real_escape_string($conn, $_POST['cid']);
    $title = mysqli_real_escape_string($conn, $_POST['title']);
    $description = mysqli_real_escape_string($conn, $_POST['description']);
    $meeting_link = mysqli_real_escape_string($conn, $_POST['meeting_link']);
    $meeting_id = mysqli_real_escape_string($conn, $_POST['meeting_id']);
    $meeting_password = mysqli_real_escape_string($conn, $_POST['meeting_password']);
    $scheduled_date = mysqli_real_escape_string($conn, $_POST['scheduled_date']);
    $start_time = mysqli_real_escape_string($conn, $_POST['start_time']);
    $end_time = mysqli_real_escape_string($conn, $_POST['end_time']);
    $duration = mysqli_real_escape_string($conn, $_POST['duration']);
    
    $insert = mysqli_query($conn, "
        INSERT INTO online_classes (cid, tid, title, description, meeting_link, meeting_id, 
        meeting_password, scheduled_date, start_time, end_time, duration_minutes, status) 
        VALUES ('$cid', '$tid', '$title', '$description', '$meeting_link', '$meeting_id', 
        '$meeting_password', '$scheduled_date', '$start_time', '$end_time', '$duration', 'scheduled')
    ");
    
    if ($insert) {
        $success = "Online class scheduled successfully!";
        // Clear form data
        $cid = $title = $description = $meeting_link = $meeting_id = $meeting_password = '';
        $scheduled_date = $start_time = $end_time = $duration = '';
    } else {
        $error = "Failed to schedule class: " . mysqli_error($conn);
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Schedule Online Class</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body {
            background-color: #f5f5f5;
            padding: 20px;
        }
        .form-container {
            background: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            max-width: 800px;
            margin: 0 auto;
        }
        .btn-green {
            background-color: rgb(8, 58, 8);
            color: white;
        }
        .btn-green:hover {
            background-color: rgb(5, 40, 5);
            color: white;
        }
        .form-label {
            font-weight: 500;
            color: rgb(8, 58, 8);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="form-container">
            <h2 class="mb-4" style="color: rgb(8, 58, 8);">
                <i class="fas fa-video"></i> Schedule Online Class
            </h2>
            
            <?php if(isset($success)): ?>
                <div class="alert alert-success alert-dismissible fade show" role="alert">
                    <i class="fas fa-check-circle"></i> <?php echo $success; ?>
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            <?php endif; ?>
            
            <?php if(isset($error)): ?>
                <div class="alert alert-danger alert-dismissible fade show" role="alert">
                    <i class="fas fa-exclamation-circle"></i> <?php echo $error; ?>
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            <?php endif; ?>
            
            <form method="POST">
                <div class="mb-3">
                    <label class="form-label">Select Class *</label>
                    <select name="cid" class="form-control" required>
                        <option value="">Select Class</option>
                        <?php 
                        $has_classes = mysqli_num_rows($classes_query);
                        if($has_classes > 0):
                            while($class = mysqli_fetch_assoc($classes_query)): 
                        ?>
                            <option value="<?php echo $class['cid']; ?>">
                                <?php echo htmlspecialchars($class['class_name']); ?> (<?php echo htmlspecialchars($class['class_code']); ?>)
                            </option>
                        <?php 
                            endwhile;
                        else:
                        ?>
                            <option value="" disabled>No classes assigned to you</option>
                        <?php endif; ?>
                    </select>
                    <?php if($has_classes == 0): ?>
                        <small class="text-danger">You don't have any classes assigned. Please contact administrator.</small>
                    <?php endif; ?>
                </div>
                
                <div class="mb-3">
                    <label class="form-label">Class Title *</label>
                    <input type="text" name="title" class="form-control" required 
                           placeholder="e.g., Mathematics Lesson 1: Algebra">
                </div>
                
                <div class="mb-3">
                    <label class="form-label">Description</label>
                    <textarea name="description" class="form-control" rows="3" 
                              placeholder="Describe what will be covered in this class..."></textarea>
                </div>
                
                <div class="mb-3">
                    <label class="form-label">Meeting Link *</label>
                    <input type="url" name="meeting_link" class="form-control" 
                           placeholder="https://meet.google.com/xxx-xxxx-xxx" required>
                </div>
                
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">Meeting ID</label>
                        <input type="text" name="meeting_id" class="form-control" 
                               placeholder="Optional: Meeting ID">
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">Meeting Password</label>
                        <input type="text" name="meeting_password" class="form-control" 
                               placeholder="Optional: Password">
                    </div>
                </div>
                
                <div class="mb-3">
                    <label class="form-label">Scheduled Date *</label>
                    <input type="date" name="scheduled_date" class="form-control" 
                           min="<?php echo date('Y-m-d'); ?>" required>
                </div>
                
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">Start Time *</label>
                        <input type="time" name="start_time" class="form-control" required>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">End Time *</label>
                        <input type="time" name="end_time" class="form-control" required>
                    </div>
                </div>
                
                <div class="mb-3">
                    <label class="form-label">Duration (minutes)</label>
                    <input type="number" name="duration" class="form-control" 
                           placeholder="Auto-calculated if left empty">
                </div>
                
                <button type="submit" class="btn btn-green w-100" <?php echo ($has_classes == 0) ? 'disabled' : ''; ?>>
                    <i class="fas fa-calendar-check"></i> Schedule Class
                </button>
            </form>
        </div>
    </div>
    
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Auto-calculate duration if start and end times are set
        document.querySelector('input[name="start_time"]').addEventListener('change', calculateDuration);
        document.querySelector('input[name="end_time"]').addEventListener('change', calculateDuration);
        
        function calculateDuration() {
            const startTime = document.querySelector('input[name="start_time"]').value;
            const endTime = document.querySelector('input[name="end_time"]').value;
            const durationField = document.querySelector('input[name="duration"]');
            
            if (startTime && endTime) {
                const start = new Date(`2000-01-01 ${startTime}`);
                const end = new Date(`2000-01-01 ${endTime}`);
                const diffMinutes = (end - start) / 60000;
                
                if (diffMinutes > 0) {
                    durationField.value = diffMinutes;
                }
            }
        }
    </script>
</body>
</html>