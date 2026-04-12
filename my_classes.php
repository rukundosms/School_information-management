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

// Get current active year
$current_year_query = mysqli_query($conn, "SELECT year_id, year FROM year WHERE status = 'active' LIMIT 1");
$current_year_id = 0;
if ($current_year_query && mysqli_num_rows($current_year_query) > 0) {
    $current_year = mysqli_fetch_assoc($current_year_query);
    $current_year_id = $current_year['year_id'];
}

// Get classes with correct student count based on student_promotion_log
$classes_query = mysqli_query($conn, "
    SELECT DISTINCT c.cid, c.class_name, c.class_code, c.class_level,
           (
               SELECT COUNT(DISTINCT s.sid)
               FROM student s
               INNER JOIN student_promotion_log spl ON s.sid = spl.sid
               WHERE spl.to_class = c.cid
               AND spl.to_year = '$current_year_id'
               AND s.status = 'active'
           ) as student_count
    FROM permision p
    INNER JOIN class c ON p.cid = c.cid
    WHERE p.tid = '$tid'
    ORDER BY c.class_name
");

if (!$classes_query) {
    die("Database error: " . mysqli_error($conn));
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Classes</title>
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
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: transform 0.3s;
        }
        .class-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
        .class-title {
            color: rgb(8, 58, 8);
            font-size: 1.2rem;
            font-weight: bold;
        }
        .btn-green {
            background-color: rgb(8, 58, 8);
            color: white;
            border: none;
        }
        .btn-green:hover {
            background-color: rgb(5, 40, 5);
            color: white;
        }
        .btn-outline-green {
            border: 1px solid rgb(8, 58, 8);
            color: rgb(8, 58, 8);
        }
        .btn-outline-green:hover {
            background-color: rgb(8, 58, 8);
            color: white;
        }
    </style>
</head>
<body>
    <div class="container-fluid">
        <h2 class="mb-4" style="color: rgb(8, 58, 8);">
            <i class="fas fa-chalkboard"></i> My Classes
        </h2>
        
        <div class="row">
            <?php 
            $class_count = mysqli_num_rows($classes_query);
            if($class_count > 0): 
                while($class = mysqli_fetch_assoc($classes_query)): 
            ?>
                <div class="col-md-6 col-lg-4">
                    <div class="class-card">
                        <div class="class-title">
                            <?php echo htmlspecialchars($class['class_name']); ?>
                        </div>
                        <p class="text-muted mt-2">
                            <?php echo htmlspecialchars($class['class_code']); ?>
                        </p>
                        <hr>
                        <div class="mb-2">
                            <i class="fas fa-users"></i> Students: 
                            <strong><?php echo $class['student_count']; ?></strong>
                        </div>
                        <div class="mb-2">
                            <i class="fas fa-chart-line"></i> Level: 
                            <strong><?php echo htmlspecialchars($class['class_level']); ?></strong>
                        </div>
                        <div class="mt-3">
                            <a href="view_class_students.php?cid=<?php echo $class['cid']; ?>" 
                               class="btn btn-sm btn-outline-green">
                                <i class="fas fa-users"></i> View Students
                            </a>
                            <a href="schedule_online_class.php?cid=<?php echo $class['cid']; ?>" 
                               class="btn btn-sm btn-green">
                                <i class="fas fa-video"></i> Schedule Class
                            </a>
                        </div>
                    </div>
                </div>
            <?php 
                endwhile;
            else: 
            ?>
                <div class="col-12">
                    <div class="text-center p-5">
                        <i class="fas fa-chalkboard fa-3x text-muted mb-3"></i>
                        <h4>No Classes Assigned</h4>
                        <p class="text-muted">You haven't been assigned to any classes yet.</p>
                    </div>
                </div>
            <?php endif; ?>
        </div>
    </div>
</body>
</html>