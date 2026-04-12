<?php
session_start();
include("connection.php");

error_reporting(E_ALL);
ini_set('display_errors', 1);

if (!isset($_SESSION['tcode'])) {
    header("location:sign.php");
    exit();
}

$assessment_id = isset($_GET['aid']) ? intval($_GET['aid']) : 0;
$tcode = mysqli_real_escape_string($conn, $_SESSION['tcode']);

// Get assessment info
$assessment_query = mysqli_query($conn, "
    SELECT a.*, c.class_name 
    FROM assessments a
    INNER JOIN class c ON a.cid = c.cid
    WHERE a.assessment_id='$assessment_id'
");
$assessment = mysqli_fetch_assoc($assessment_query);

if (!$assessment) {
    header("location:manage_assessments.php");
    exit();
}

// Get all submissions with student info
$submissions_query = mysqli_query($conn, "
    SELECT att.*, s.firstname, s.lastname, s.reg, s.class
    FROM assessment_attempts att
    INNER JOIN student s ON att.sid = s.sid
    WHERE att.assessment_id = '$assessment_id' AND att.status = 'submitted'
    ORDER BY att.submitted_at DESC
");
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Submissions - <?php echo htmlspecialchars($assessment['title']); ?></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body { background: #f0f2f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; }
        .header-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 12px; margin-bottom: 25px; }
        .submission-table { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .table-custom { margin-bottom: 0; }
        .table-custom th { background: #f8f9fa; border-bottom: 2px solid #e0e0e0; }
        .status-graded { background: #e6f4ea; color: #34a853; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; display: inline-block; }
        .status-pending { background: #fef7e0; color: #f9ab00; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; display: inline-block; }
        .btn-grade { background: #1a73e8; color: white; border: none; padding: 5px 15px; border-radius: 6px; font-size: 13px; }
        .btn-grade:hover { background: #1557b0; color: white; }
        .score-badge { font-weight: bold; font-size: 16px; }
    </style>
</head>
<body>
    <div class="container-fluid">
        <div class="header-card">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h2><i class="fas fa-file-alt"></i> Submissions</h2>
                    <p class="mb-0"><?php echo htmlspecialchars($assessment['title']); ?> | <?php echo htmlspecialchars($assessment['class_name']); ?></p>
                    <small>Total Marks: <?php echo $assessment['total_marks']; ?> | Passing: <?php echo $assessment['passing_marks']; ?></small>
                </div>
                <div>
                    <a href="manage_assessments.php" class="btn btn-light">
                        <i class="fas fa-arrow-left"></i> Back to Assessments
                    </a>
                </div>
            </div>
        </div>
        
        <div class="submission-table">
            <table class="table table-custom">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Student Name</th>
                        <th>Registration No</th>
                        <th>Submitted Date</th>
                        <th>Score</th>
                        <th>Percentage</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    <?php 
                    $count = 1;
                    while($sub = mysqli_fetch_assoc($submissions_query)): 
                        // Get responses for this attempt
                        $responses_query = mysqli_query($conn, "
                            SELECT SUM(marks_awarded) as total_score 
                            FROM assessment_responses 
                            WHERE attempt_id = '{$sub['attempt_id']}'
                        ");
                        $score_data = mysqli_fetch_assoc($responses_query);
                        $total_score = $score_data['total_score'] ?? 0;
                        $percentage = ($total_score / $assessment['total_marks']) * 100;
                        $is_graded = $total_score > 0 || $sub['submitted_at'] != $sub['started_at'];
                    ?>
                        <tr>
                            <td><?php echo $count++; ?></td>
                            <td>
                                <strong><?php echo htmlspecialchars($sub['firstname'] . ' ' . $sub['lastname']); ?></strong>
                                <br>
                                <small class="text-muted"><?php echo htmlspecialchars($sub['class']); ?></small>
                            </td>
                            <td><?php echo htmlspecialchars($sub['reg']); ?></td>
                            <td><?php echo date('M d, Y H:i', strtotime($sub['submitted_at'])); ?></td>
                            <td class="score-badge">
                                <?php if($total_score > 0): ?>
                                    <span class="text-success"><?php echo $total_score; ?>/<?php echo $assessment['total_marks']; ?></span>
                                <?php else: ?>
                                    <span class="text-muted">Pending</span>
                                <?php endif; ?>
                            </td>
                            <td>
                                <?php if($total_score > 0): ?>
                                    <div class="progress" style="height: 6px; width: 100px;">
                                        <div class="progress-bar bg-success" style="width: <?php echo $percentage; ?>%"></div>
                                    </div>
                                    <small><?php echo round($percentage, 1); ?>%</small>
                                <?php else: ?>
                                    --
                                <?php endif; ?>
                            </td>
                            <td>
                                <?php if($total_score > 0): ?>
                                    <span class="status-graded"><i class="fas fa-check-circle"></i> Graded</span>
                                <?php else: ?>
                                    <span class="status-pending"><i class="fas fa-clock"></i> Pending</span>
                                <?php endif; ?>
                            </td>
                            <td>
                                <a href="grade_submission.php?attempt_id=<?php echo $sub['attempt_id']; ?>&aid=<?php echo $assessment_id; ?>" class="btn-grade">
                                    <i class="fas fa-edit"></i> 
                                    <?php echo $total_score > 0 ? 'Review' : 'Grade'; ?>
                                </a>
                            </td>
                        </tr>
                    <?php endwhile; ?>
                    
                    <?php if(mysqli_num_rows($submissions_query) == 0): ?>
                        <tr>
                            <td colspan="8" class="text-center py-5">
                                <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                                <p>No submissions yet for this assessment.</p>
                            </td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>