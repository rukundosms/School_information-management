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

// Get all assessments with results
$results_query = mysqli_query($conn, "
    SELECT a.*, c.class_name,
           COUNT(DISTINCT sub.submission_id) as total_submissions,
           AVG(sub.obtained_marks) as average_marks,
           MIN(sub.obtained_marks) as min_marks,
           MAX(sub.obtained_marks) as max_marks
    FROM assessments a
    JOIN class c ON a.cid = c.cid
    LEFT JOIN assessment_submissions sub ON a.assessment_id = sub.assessment_id
    WHERE a.tid='$tid' AND a.status = 'completed'
    GROUP BY a.assessment_id
    ORDER BY a.created_at DESC
");
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>View Results</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body {
            background-color: #f5f5f5;
            padding: 20px;
        }
        .result-card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
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
        .stat-box {
            text-align: center;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 5px;
        }
        .stat-number {
            font-size: 1.5rem;
            font-weight: bold;
            color: rgb(8, 58, 8);
        }
    </style>
</head>
<body>
    <div class="container-fluid">
        <h2 class="mb-4" style="color: rgb(8, 58, 8);">
            <i class="fas fa-chart-bar"></i> Assessment Results
        </h2>
        
        <?php while($result = mysqli_fetch_assoc($results_query)): ?>
            <div class="result-card">
                <div class="row">
                    <div class="col-md-4">
                        <h5><?php echo htmlspecialchars($result['title']); ?></h5>
                        <p class="text-muted">
                            <i class="fas fa-chalkboard"></i> <?php echo $result['class_name']; ?>
                            <br>
                            <i class="fas fa-star"></i> Total: <?php echo $result['total_marks']; ?> marks
                        </p>
                    </div>
                    <div class="col-md-8">
                        <div class="row">
                            <div class="col-md-3">
                                <div class="stat-box">
                                    <div class="stat-number"><?php echo $result['total_submissions']; ?></div>
                                    <small>Submissions</small>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="stat-box">
                                    <div class="stat-number"><?php echo round($result['average_marks'], 2); ?></div>
                                    <small>Average Marks</small>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="stat-box">
                                    <div class="stat-number"><?php echo $result['min_marks']; ?></div>
                                    <small>Minimum Marks</small>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="stat-box">
                                    <div class="stat-number"><?php echo $result['max_marks']; ?></div>
                                    <small>Maximum Marks</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="mt-3 text-end">
                    <a href="view_detailed_results.php?aid=<?php echo $result['assessment_id']; ?>" class="btn btn-sm btn-green">
                        <i class="fas fa-chart-line"></i> View Detailed Report
                    </a>
                </div>
            </div>
        <?php endwhile; ?>
        
        <?php if(mysqli_num_rows($results_query) == 0): ?>
            <div class="text-center p-5">
                <i class="fas fa-chart-bar fa-3x text-muted mb-3"></i>
                <p>No completed assessments with results yet.</p>
            </div>
        <?php endif; ?>
    </div>
</body>
</html>