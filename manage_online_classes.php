<?php
session_start();
include("connection.php");

if (!isset($_SESSION['tcode'])) {
    header("location:sign.php");
    exit();
}

$tcode = $_SESSION['tcode'];
$teacher_query = mysqli_query($conn, "SELECT * FROM teacher WHERE tcode='$tcode'");
$teacher = mysqli_fetch_assoc($teacher_query);
$tid = $teacher['tid'];

// Handle status update
if (isset($_GET['cancel'])) {
    $class_id = $_GET['cancel'];
    mysqli_query($conn, "UPDATE online_classes SET status='cancelled' WHERE class_id='$class_id'");
    header("location:manage_online_classes.php");
}

// Get all online classes
$classes_query = mysqli_query($conn, "
    SELECT oc.*, c.class_name 
    FROM online_classes oc
    JOIN class c ON oc.cid = c.cid
    WHERE oc.tid='$tid'
    ORDER BY oc.scheduled_date DESC, oc.start_time DESC
");
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manage Online Classes</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body {
            background-color: #f5f5f5;
            padding: 20px;
        }
        .class-card {
            background: white;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .btn-green {
            background-color: rgb(8, 58, 8);
            color: white;
        }
        .btn-green:hover {
            background-color: rgb(5, 40, 5);
            color: white;
        }
        .status-badge {
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 0.75rem;
        }
        .status-scheduled { background: #e8f5e9; color: rgb(8, 58, 8); }
        .status-ongoing { background: #fff3e0; color: #f57c00; }
        .status-completed { background: #e3f2fd; color: #1976d2; }
        .status-cancelled { background: #ffebee; color: #c62828; }
    </style>
</head>
<body>
    <div class="container-fluid">
        <h2 class="mb-4" style="color: rgb(8, 58, 8);">
            <i class="fas fa-calendar-alt"></i> Manage Online Classes
        </h2>
        
        <?php while($class = mysqli_fetch_assoc($classes_query)): ?>
            <div class="class-card">
                <div class="row align-items-center">
                    <div class="col-md-4">
                        <h5><?php echo htmlspecialchars($class['title']); ?></h5>
                        <small class="text-muted">
                            <i class="fas fa-chalkboard"></i> <?php echo $class['class_name']; ?>
                        </small>
                    </div>
                    <div class="col-md-3">
                        <small>
                            <i class="far fa-calendar"></i> <?php echo date('M d, Y', strtotime($class['scheduled_date'])); ?>
                            <br>
                            <i class="far fa-clock"></i> <?php echo date('h:i A', strtotime($class['start_time'])); ?>
                            - <?php echo date('h:i A', strtotime($class['end_time'])); ?>
                        </small>
                    </div>
                    <div class="col-md-2">
                        <span class="status-badge status-<?php echo $class['status']; ?>">
                            <?php echo ucfirst($class['status']); ?>
                        </span>
                    </div>
                    <div class="col-md-3 text-end">
                        <?php if($class['status'] == 'scheduled'): ?>
                            <a href="<?php echo $class['meeting_link']; ?>" target="_blank" class="btn btn-sm btn-green">
                                <i class="fas fa-door-open"></i> Start
                            </a>
                            <a href="?cancel=<?php echo $class['class_id']; ?>" class="btn btn-sm btn-outline-danger" onclick="return confirm('Cancel this class?')">
                                <i class="fas fa-times"></i> Cancel
                            </a>
                        <?php elseif($class['status'] == 'ongoing'): ?>
                            <a href="<?php echo $class['meeting_link']; ?>" target="_blank" class="btn btn-sm btn-green">
                                <i class="fas fa-door-open"></i> Join
                            </a>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        <?php endwhile; ?>
        
        <?php if(mysqli_num_rows($classes_query) == 0): ?>
            <div class="text-center p-5">
                <i class="fas fa-calendar-alt fa-3x text-muted mb-3"></i>
                <p>No online classes scheduled yet.</p>
                <a href="schedule_online_class.php" class="btn btn-green">Schedule a Class</a>
            </div>
        <?php endif; ?>
    </div>
</body>
</html>