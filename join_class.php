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

// Get current time for ongoing classes
$current_datetime = date('Y-m-d H:i:s');
$current_date = date('Y-m-d');
$current_time = date('H:i:s');

// Get ongoing classes (started but not ended)
$ongoing_classes = mysqli_query($conn, "
    SELECT oc.*, c.class_name 
    FROM online_classes oc
    JOIN class c ON oc.cid = c.cid
    WHERE oc.tid='$tid' 
    AND oc.status = 'scheduled'
    AND oc.scheduled_date = '$current_date'
    AND oc.start_time <= '$current_time'
    AND oc.end_time >= '$current_time'
    ORDER BY oc.start_time ASC
");

// Get upcoming classes (today's future classes)
$upcoming_today = mysqli_query($conn, "
    SELECT oc.*, c.class_name 
    FROM online_classes oc
    JOIN class c ON oc.cid = c.cid
    WHERE oc.tid='$tid' 
    AND oc.status = 'scheduled'
    AND oc.scheduled_date = '$current_date'
    AND oc.start_time > '$current_time'
    ORDER BY oc.start_time ASC
");

// Get future classes (future dates)
$future_classes = mysqli_query($conn, "
    SELECT oc.*, c.class_name 
    FROM online_classes oc
    JOIN class c ON oc.cid = c.cid
    WHERE oc.tid='$tid' 
    AND oc.status = 'scheduled'
    AND oc.scheduled_date > '$current_date'
    ORDER BY oc.scheduled_date ASC, oc.start_time ASC
    LIMIT 10
");

// Get completed/recent classes
$recent_classes = mysqli_query($conn, "
    SELECT oc.*, c.class_name 
    FROM online_classes oc
    JOIN class c ON oc.cid = c.cid
    WHERE oc.tid='$tid' 
    AND (oc.status = 'completed' OR oc.scheduled_date < '$current_date')
    ORDER BY oc.scheduled_date DESC, oc.start_time DESC
    LIMIT 10
");

// Handle class status update (mark as ongoing/completed)
if (isset($_GET['start_class'])) {
    $class_id = $_GET['start_class'];
    mysqli_query($conn, "UPDATE online_classes SET status='ongoing' WHERE class_id='$class_id'");
    header("location:join_class.php");
}

if (isset($_GET['end_class'])) {
    $class_id = $_GET['end_class'];
    mysqli_query($conn, "UPDATE online_classes SET status='completed' WHERE class_id='$class_id'");
    header("location:join_class.php");
}

if (isset($_GET['cancel_class'])) {
    $class_id = $_GET['cancel_class'];
    mysqli_query($conn, "UPDATE online_classes SET status='cancelled' WHERE class_id='$class_id'");
    header("location:join_class.php");
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Join Online Classes</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body {
            background-color: #f5f5f5;
            padding: 20px;
        }
        
        .section-title {
            color: rgb(8, 58, 8);
            margin: 30px 0 20px 0;
            padding-bottom: 10px;
            border-bottom: 2px solid rgb(8, 58, 8);
        }
        
        .class-card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: transform 0.3s, box-shadow 0.3s;
        }
        
        .class-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .class-card.ongoing {
            border-left: 4px solid #4caf50;
            background: linear-gradient(135deg, #ffffff 0%, #f9fff9 100%);
        }
        
        .class-card.upcoming {
            border-left: 4px solid #ff9800;
        }
        
        .class-card.completed {
            border-left: 4px solid #9e9e9e;
            opacity: 0.8;
        }
        
        .btn-join {
            background-color: #4caf50;
            color: white;
            border: none;
            padding: 8px 20px;
            border-radius: 5px;
            transition: all 0.3s;
        }
        
        .btn-join:hover {
            background-color: rgb(8, 58, 8);
            transform: scale(1.05);
            color: white;
        }
        
        .btn-start {
            background-color: #ff9800;
            color: white;
            border: none;
            padding: 8px 20px;
            border-radius: 5px;
        }
        
        .btn-start:hover {
            background-color: #f57c00;
            color: white;
        }
        
        .btn-end {
            background-color: #f44336;
            color: white;
            border: none;
            padding: 8px 20px;
            border-radius: 5px;
        }
        
        .btn-end:hover {
            background-color: #d32f2f;
            color: white;
        }
        
        .btn-cancel {
            background-color: #9e9e9e;
            color: white;
            border: none;
            padding: 8px 20px;
            border-radius: 5px;
        }
        
        .btn-cancel:hover {
            background-color: #757575;
            color: white;
        }
        
        .status-badge {
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: bold;
            display: inline-block;
        }
        
        .status-ongoing {
            background-color: #e8f5e9;
            color: #2e7d32;
        }
        
        .status-scheduled {
            background-color: #fff3e0;
            color: #f57c00;
        }
        
        .status-completed {
            background-color: #f5f5f5;
            color: #666;
        }
        
        .status-cancelled {
            background-color: #ffebee;
            color: #c62828;
        }
        
        .meeting-info {
            background-color: #f8f9fa;
            padding: 10px;
            border-radius: 5px;
            margin-top: 10px;
        }
        
        .countdown-timer {
            font-size: 0.85rem;
            color: #ff9800;
            font-weight: bold;
        }
        
        @media (max-width: 768px) {
            .class-card .row > div {
                margin-bottom: 10px;
            }
            
            .text-md-end {
                text-align: left !important;
            }
        }
    </style>
</head>
<body>
    <div class="container-fluid">
        <h2 class="mb-4" style="color: rgb(8, 58, 8);">
            <i class="fas fa-door-open"></i> Join Online Classes
        </h2>
        
        <!-- Ongoing Classes Section -->
        <?php if(mysqli_num_rows($ongoing_classes) > 0): ?>
            <h4 class="section-title">
                <i class="fas fa-play-circle"></i> Ongoing Classes
            </h4>
            <?php while($class = mysqli_fetch_assoc($ongoing_classes)): ?>
                <div class="class-card ongoing">
                    <div class="row align-items-center">
                        <div class="col-md-5">
                            <h5 class="mb-1"><?php echo htmlspecialchars($class['title']); ?></h5>
                            <p class="text-muted mb-0">
                                <i class="fas fa-chalkboard"></i> <?php echo $class['class_name']; ?>
                            </p>
                            <span class="status-badge status-ongoing mt-2">
                                <i class="fas fa-video"></i> Ongoing
                            </span>
                        </div>
                        <div class="col-md-3">
                            <small class="text-muted">
                                <i class="far fa-calendar"></i> <?php echo date('M d, Y', strtotime($class['scheduled_date'])); ?>
                                <br>
                                <i class="far fa-clock"></i> <?php echo date('h:i A', strtotime($class['start_time'])); ?> - 
                                <?php echo date('h:i A', strtotime($class['end_time'])); ?>
                            </small>
                        </div>
                        <div class="col-md-4 text-md-end">
                            <a href="<?php echo $class['meeting_link']; ?>" target="_blank" class="btn btn-join">
                                <i class="fas fa-door-open"></i> Join Class Now
                            </a>
                            <a href="?end_class=<?php echo $class['class_id']; ?>" class="btn btn-end mt-2 mt-md-0 ms-2" onclick="return confirm('Mark this class as completed?')">
                                <i class="fas fa-check"></i> End Class
                            </a>
                        </div>
                    </div>
                    <?php if($class['meeting_id'] || $class['meeting_password']): ?>
                        <div class="meeting-info">
                            <small>
                                <?php if($class['meeting_id']): ?>
                                    <strong>Meeting ID:</strong> <?php echo $class['meeting_id']; ?>
                                <?php endif; ?>
                                <?php if($class['meeting_password']): ?>
                                    | <strong>Password:</strong> <?php echo $class['meeting_password']; ?>
                                <?php endif; ?>
                            </small>
                        </div>
                    <?php endif; ?>
                </div>
            <?php endwhile; ?>
        <?php endif; ?>
        
        <!-- Upcoming Classes Today -->
        <?php if(mysqli_num_rows($upcoming_today) > 0): ?>
            <h4 class="section-title">
                <i class="fas fa-hourglass-half"></i> Today's Upcoming Classes
            </h4>
            <?php while($class = mysqli_fetch_assoc($upcoming_today)): 
                // Calculate time remaining
                $start_time = strtotime($class['start_time']);
                $current_time = strtotime($current_time);
                $time_diff = $start_time - $current_time;
                $hours_remaining = floor($time_diff / 3600);
                $minutes_remaining = floor(($time_diff % 3600) / 60);
            ?>
                <div class="class-card upcoming">
                    <div class="row align-items-center">
                        <div class="col-md-5">
                            <h5 class="mb-1"><?php echo htmlspecialchars($class['title']); ?></h5>
                            <p class="text-muted mb-0">
                                <i class="fas fa-chalkboard"></i> <?php echo $class['class_name']; ?>
                            </p>
                            <span class="status-badge status-scheduled mt-2">
                                <i class="fas fa-clock"></i> Scheduled
                            </span>
                        </div>
                        <div class="col-md-3">
                            <small class="text-muted">
                                <i class="far fa-calendar"></i> <?php echo date('M d, Y', strtotime($class['scheduled_date'])); ?>
                                <br>
                                <i class="far fa-clock"></i> <?php echo date('h:i A', strtotime($class['start_time'])); ?> - 
                                <?php echo date('h:i A', strtotime($class['end_time'])); ?>
                            </small>
                            <div class="countdown-timer mt-1">
                                <i class="fas fa-hourglass-start"></i> 
                                Starts in: <?php echo $hours_remaining > 0 ? $hours_remaining . 'h ' : ''; ?><?php echo $minutes_remaining; ?> min
                            </div>
                        </div>
                        <div class="col-md-4 text-md-end">
                            <a href="?start_class=<?php echo $class['class_id']; ?>" class="btn btn-start" onclick="return confirm('Start this class now?')">
                                <i class="fas fa-play"></i> Start Class
                            </a>
                            <a href="?cancel_class=<?php echo $class['class_id']; ?>" class="btn btn-cancel mt-2 mt-md-0 ms-2" onclick="return confirm('Cancel this class?')">
                                <i class="fas fa-times"></i> Cancel
                            </a>
                        </div>
                    </div>
                    <?php if($class['meeting_id'] || $class['meeting_password']): ?>
                        <div class="meeting-info">
                            <small>
                                <?php if($class['meeting_id']): ?>
                                    <strong>Meeting ID:</strong> <?php echo $class['meeting_id']; ?>
                                <?php endif; ?>
                                <?php if($class['meeting_password']): ?>
                                    | <strong>Password:</strong> <?php echo $class['meeting_password']; ?>
                                <?php endif; ?>
                            </small>
                        </div>
                    <?php endif; ?>
                </div>
            <?php endwhile; ?>
        <?php endif; ?>
        
        <!-- Future Classes -->
        <?php if(mysqli_num_rows($future_classes) > 0): ?>
            <h4 class="section-title">
                <i class="fas fa-calendar-alt"></i> Upcoming Classes
            </h4>
            <?php while($class = mysqli_fetch_assoc($future_classes)): ?>
                <div class="class-card">
                    <div class="row align-items-center">
                        <div class="col-md-5">
                            <h5 class="mb-1"><?php echo htmlspecialchars($class['title']); ?></h5>
                            <p class="text-muted mb-0">
                                <i class="fas fa-chalkboard"></i> <?php echo $class['class_name']; ?>
                            </p>
                            <span class="status-badge status-scheduled mt-2">
                                <i class="fas fa-calendar"></i> Upcoming
                            </span>
                        </div>
                        <div class="col-md-3">
                            <small class="text-muted">
                                <i class="far fa-calendar"></i> <?php echo date('M d, Y', strtotime($class['scheduled_date'])); ?>
                                <br>
                                <i class="far fa-clock"></i> <?php echo date('h:i A', strtotime($class['start_time'])); ?> - 
                                <?php echo date('h:i A', strtotime($class['end_time'])); ?>
                            </small>
                        </div>
                        <div class="col-md-4 text-md-end">
                            <a href="?cancel_class=<?php echo $class['class_id']; ?>" class="btn btn-cancel" onclick="return confirm('Cancel this class?')">
                                <i class="fas fa-times"></i> Cancel
                            </a>
                            <a href="edit_class.php?id=<?php echo $class['class_id']; ?>" class="btn btn-outline-secondary mt-2 mt-md-0 ms-2">
                                <i class="fas fa-edit"></i> Edit
                            </a>
                        </div>
                    </div>
                    <?php if($class['meeting_id'] || $class['meeting_password']): ?>
                        <div class="meeting-info">
                            <small>
                                <?php if($class['meeting_id']): ?>
                                    <strong>Meeting ID:</strong> <?php echo $class['meeting_id']; ?>
                                <?php endif; ?>
                                <?php if($class['meeting_password']): ?>
                                    | <strong>Password:</strong> <?php echo $class['meeting_password']; ?>
                                <?php endif; ?>
                            </small>
                        </div>
                    <?php endif; ?>
                </div>
            <?php endwhile; ?>
        <?php endif; ?>
        
        <!-- Recent/Completed Classes -->
        <?php if(mysqli_num_rows($recent_classes) > 0): ?>
            <h4 class="section-title">
                <i class="fas fa-history"></i> Recent Classes
            </h4>
            <?php while($class = mysqli_fetch_assoc($recent_classes)): ?>
                <div class="class-card completed">
                    <div class="row align-items-center">
                        <div class="col-md-6">
                            <h5 class="mb-1"><?php echo htmlspecialchars($class['title']); ?></h5>
                            <p class="text-muted mb-0">
                                <i class="fas fa-chalkboard"></i> <?php echo $class['class_name']; ?>
                            </p>
                            <span class="status-badge status-completed mt-2">
                                <i class="fas fa-check-circle"></i> Completed
                            </span>
                        </div>
                        <div class="col-md-4">
                            <small class="text-muted">
                                <i class="far fa-calendar"></i> <?php echo date('M d, Y', strtotime($class['scheduled_date'])); ?>
                                <br>
                                <i class="far fa-clock"></i> <?php echo date('h:i A', strtotime($class['start_time'])); ?> - 
                                <?php echo date('h:i A', strtotime($class['end_time'])); ?>
                            </small>
                        </div>
                        <div class="col-md-2 text-md-end">
                            <?php if($class['recording_url']): ?>
                                <a href="<?php echo $class['recording_url']; ?>" target="_blank" class="btn btn-sm btn-outline-primary">
                                    <i class="fas fa-video"></i> Recording
                                </a>
                            <?php endif; ?>
                        </div>
                    </div>
                    <?php if($class['meeting_id']): ?>
                        <div class="meeting-info">
                            <small><strong>Meeting ID:</strong> <?php echo $class['meeting_id']; ?></small>
                        </div>
                    <?php endif; ?>
                </div>
            <?php endwhile; ?>
        <?php endif; ?>
        
        <!-- No Classes Message -->
        <?php if(mysqli_num_rows($ongoing_classes) == 0 && mysqli_num_rows($upcoming_today) == 0 && mysqli_num_rows($future_classes) == 0 && mysqli_num_rows($recent_classes) == 0): ?>
            <div class="text-center p-5">
                <i class="fas fa-door-closed fa-4x text-muted mb-3"></i>
                <h4>No Classes Found</h4>
                <p class="text-muted">You haven't scheduled any online classes yet.</p>
                <a href="schedule_online_class.php" class="btn btn-join">
                    <i class="fas fa-plus-circle"></i> Schedule Your First Class
                </a>
            </div>
        <?php endif; ?>
        
        <!-- Quick Actions -->
        <div class="row mt-4">
            <div class="col-12">
                <div class="card">
                    <div class="card-body">
                        <h6 class="mb-3">Quick Actions</h6>
                        <a href="schedule_online_class.php" class="btn btn-sm btn-outline-success me-2">
                            <i class="fas fa-plus-circle"></i> Schedule New Class
                        </a>
                        <a href="manage_online_classes.php" class="btn btn-sm btn-outline-secondary">
                            <i class="fas fa-calendar-alt"></i> Manage All Classes
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Auto-refresh the page every 60 seconds to update class statuses
        setTimeout(function() {
            location.reload();
        }, 60000);
        
        // Countdown timer for upcoming classes (if needed)
        function updateCountdowns() {
            // This function can be expanded to show real-time countdowns
            console.log("Checking for classes starting soon...");
        }
        
        // Check for classes starting in the next 5 minutes
        setInterval(updateCountdowns, 30000);
    </script>
</body>
</html>