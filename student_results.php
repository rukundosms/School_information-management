<?php
session_start();
include("connection.php");

if (!isset($_SESSION['sid'])) {
    header("location:student_login.php");
    exit();
}

$sid = mysqli_real_escape_string($conn, $_SESSION['sid']);
$student_class_id = $_SESSION['student_class_id'];

// Get all graded assessments
$results_query = mysqli_query($conn, "
    SELECT a.*, sub.obtained_marks, sub.feedback, sub.graded_date,
           (SELECT COUNT(*) FROM assessment_questions WHERE assessment_id = a.assessment_id) as total_questions
    FROM assessments a
    INNER JOIN class c ON a.cid = c.cid
    INNER JOIN assessment_submissions sub ON a.assessment_id = sub.assessment_id
    WHERE c.cid = '$student_class_id' 
    AND sub.sid = '$sid'
    AND sub.status = 'graded'
    ORDER BY sub.graded_date DESC
");

// Calculate overall performance
$overall = mysqli_fetch_assoc(mysqli_query($conn, "
    SELECT 
        SUM(sub.obtained_marks) as total_obtained,
        SUM(a.total_marks) as total_possible,
        AVG((sub.obtained_marks / a.total_marks) * 100) as avg_percentage,
        COUNT(*) as total_assessments
    FROM assessments a
    INNER JOIN class c ON a.cid = c.cid
    INNER JOIN assessment_submissions sub ON a.assessment_id = sub.assessment_id
    WHERE c.cid = '$student_class_id' 
    AND sub.sid = '$sid'
    AND sub.status = 'graded'
"));

include("student_sidebar.php");
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Results - Student Portal</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body {
            background-color: #f5f5f5;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .result-card {
            background: white;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            transition: all 0.3s;
        }
        .result-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 5px 20px rgba(0,0,0,0.15);
        }
        .score-circle {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.8rem;
            font-weight: bold;
            margin: 0 auto;
        }
        .grade-A { background: #28a745; color: white; }
        .grade-B { background: #17a2b8; color: white; }
        .grade-C { background: #ffc107; color: black; }
        .grade-D { background: #dc3545; color: white; }
        .overall-card {
            background: linear-gradient(135deg, rgb(8, 58, 8) 0%, rgb(5, 40, 5) 100%);
            color: white;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .progress-bar-custom {
            height: 30px;
            border-radius: 15px;
        }
    </style>
</head>
<body>
    <div class="container-fluid">
        <div class="row">
            <!-- Sidebar already included -->
            
            <!-- Main Content -->
            <div class="col-md-10 main-content">
                <h2 class="mb-4" style="color: rgb(8, 58, 8);">
                    <i class="fas fa-chart-line"></i> My Academic Results
                </h2>
                
                <!-- Overall Performance -->
                <div class="overall-card">
                    <div class="row align-items-center">
                        <div class="col-md-3 text-center">
                            <div class="score-circle grade-<?php 
                                $avg = $overall['avg_percentage'];
                                echo $avg >= 80 ? 'A' : ($avg >= 70 ? 'B' : ($avg >= 50 ? 'C' : 'D'));
                            ?>">
                                <?php echo round($overall['avg_percentage']); ?>%
                            </div>
                        </div>
                        <div class="col-md-9">
                            <h4>Overall Performance</h4>
                            <div class="row mt-3">
                                <div class="col-md-4">
                                    <small>Total Assessments</small>
                                    <h5><?php echo $overall['total_assessments']; ?></h5>
                                </div>
                                <div class="col-md-4">
                                    <small>Total Marks</small>
                                    <h5><?php echo $overall['total_obtained']; ?> / <?php echo $overall['total_possible']; ?></h5>
                                </div>
                                <div class="col-md-4">
                                    <small>Average Score</small>
                                    <h5><?php echo round($overall['avg_percentage'], 1); ?>%</h5>
                                </div>
                            </div>
                            <div class="progress mt-2">
                                <div class="progress-bar progress-bar-custom bg-warning" 
                                     style="width: <?php echo $overall['avg_percentage']; ?>%">
                                    <?php echo round($overall['avg_percentage']); ?>%
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Results List -->
                <div class="card">
                    <div class="card-header" style="background-color: rgb(8, 58, 8); color: white;">
                        <i class="fas fa-list"></i> Assessment Results
                    </div>
                    <div class="card-body">
                        <?php if(mysqli_num_rows($results_query) > 0): ?>
                            <?php while($result = mysqli_fetch_assoc($results_query)): 
                                $percentage = ($result['obtained_marks'] / $result['total_marks']) * 100;
                                $grade = $percentage >= 80 ? 'A' : ($percentage >= 70 ? 'B' : ($percentage >= 50 ? 'C' : 'D'));
                            ?>
                                <div class="result-card">
                                    <div class="row">
                                        <div class="col-md-8">
                                            <h5><?php echo htmlspecialchars($result['title']); ?></h5>
                                            <p class="text-muted"><?php echo htmlspecialchars($result['description']); ?></p>
                                            <small class="text-muted">
                                                <i class="fas fa-calendar-alt"></i> Completed: <?php echo date('M d, Y', strtotime($result['graded_date'])); ?><br>
                                                <i class="fas fa-question-circle"></i> Questions: <?php echo $result['total_questions']; ?>
                                            </small>
                                            <?php if($result['feedback']): ?>
                                                <div class="mt-2">
                                                    <span class="badge bg-info">Feedback:</span>
                                                    <small><?php echo htmlspecialchars($result['feedback']); ?></small>
                                                </div>
                                            <?php endif; ?>
                                        </div>
                                        <div class="col-md-4 text-center">
                                            <div class="score-circle grade-<?php echo $grade; ?>" style="width: 80px; height: 80px; font-size: 1.3rem;">
                                                <?php echo round($percentage); ?>%
                                            </div>
                                            <div class="mt-2">
                                                <h5><?php echo $result['obtained_marks']; ?>/<?php echo $result['total_marks']; ?></h5>
                                                <span class="badge bg-<?php echo $grade == 'A' || $grade == 'B' ? 'success' : ($grade == 'C' ? 'warning' : 'danger'); ?>">
                                                    Grade: <?php echo $grade; ?>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            <?php endwhile; ?>
                        <?php else: ?>
                            <div class="text-center p-5">
                                <i class="fas fa-chart-line fa-3x text-muted mb-3"></i>
                                <h4>No Results Available</h4>
                                <p>Your graded assessments will appear here once teachers release results.</p>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>