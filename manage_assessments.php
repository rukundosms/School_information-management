<?php
session_start();
include("connection.php");

error_reporting(E_ALL);
ini_set('display_errors', 1);

if (!isset($_SESSION['tcode'])) {
    header("location:sign.php");
    exit();
}

$tcode = mysqli_real_escape_string($conn, $_SESSION['tcode']);
$teacher_query = mysqli_query($conn, "SELECT * FROM teacher WHERE tcode='$tcode'");
$teacher = mysqli_fetch_assoc($teacher_query);
$tid = $teacher['tid'];

// Handle status update
if (isset($_GET['publish'])) {
    $id = intval($_GET['publish']);
    mysqli_query($conn, "UPDATE assessments SET status='published' WHERE assessment_id='$id' AND tid='$tid'");
    header("location:manage_assessments.php");
    exit();
}

if (isset($_GET['unpublish'])) {
    $id = intval($_GET['unpublish']);
    mysqli_query($conn, "UPDATE assessments SET status='draft' WHERE assessment_id='$id' AND tid='$tid'");
    header("location:manage_assessments.php");
    exit();
}

if (isset($_GET['delete'])) {
    $id = intval($_GET['delete']);
    // Delete related records first
    mysqli_query($conn, "DELETE FROM assessment_responses WHERE attempt_id IN (SELECT attempt_id FROM assessment_attempts WHERE assessment_id='$id')");
    mysqli_query($conn, "DELETE FROM assessment_autosave WHERE attempt_id IN (SELECT attempt_id FROM assessment_attempts WHERE assessment_id='$id')");
    mysqli_query($conn, "DELETE FROM assessment_attempts WHERE assessment_id='$id'");
    mysqli_query($conn, "DELETE FROM assessment_questions WHERE assessment_id='$id'");
    mysqli_query($conn, "DELETE FROM assessments WHERE assessment_id='$id' AND tid='$tid'");
    header("location:manage_assessments.php");
    exit();
}

// Get all assessments with submission stats
$assessments_query = mysqli_query($conn, "
    SELECT a.*, c.class_name,
           (SELECT COUNT(*) FROM assessment_attempts WHERE assessment_id = a.assessment_id AND status = 'submitted') as total_submissions,
           (SELECT COUNT(*) FROM assessment_attempts WHERE assessment_id = a.assessment_id AND status = 'submitted' AND submitted_at IS NOT NULL) as graded_submissions,
           (SELECT COUNT(*) FROM assessment_questions WHERE assessment_id = a.assessment_id) as total_questions
    FROM assessments a
    JOIN class c ON a.cid = c.cid
    WHERE a.tid='$tid'
    ORDER BY a.created_at DESC
");
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manage Assessments</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body { background: #f0f2f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; }
        .dashboard-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 12px; margin-bottom: 25px; }
        .assessment-card { background: white; border-radius: 12px; margin-bottom: 20px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: transform 0.2s; }
        .assessment-card:hover { transform: translateY(-3px); box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
        .card-header-custom { padding: 20px; border-bottom: 1px solid #e0e0e0; background: #f8f9fa; }
        .card-body-custom { padding: 20px; }
        .status-badge { padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
        .status-draft { background: #fef7e0; color: #f9ab00; }
        .status-published { background: #e6f4ea; color: #34a853; }
        .btn-green { background: #1a73e8; color: white; border: none; padding: 6px 16px; border-radius: 6px; font-size: 13px; }
        .btn-green:hover { background: #1557b0; color: white; }
        .stat-number { font-size: 24px; font-weight: bold; color: #1a73e8; }
        .stat-label { font-size: 12px; color: #5f6368; }
        .progress-custom { height: 6px; background: #e0e0e0; border-radius: 3px; overflow: hidden; }
        .progress-fill { height: 100%; background: #34a853; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="container-fluid">
        <div class="dashboard-header">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h2><i class="fas fa-tasks"></i> Manage Assessments</h2>
                    <p class="mb-0">Welcome, <?php echo htmlspecialchars($teacher['fname'] . ' ' . $teacher['lname']); ?></p>
                </div>
                <div>
                    <a href="create_assessment.php" class="btn btn-light">
                        <i class="fas fa-plus-circle"></i> Create New Assessment
                    </a>
                    <a href="sign.php?logout=1" class="btn btn-outline-light ms-2">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </a>
                </div>
            </div>
        </div>
        
        <?php if(mysqli_num_rows($assessments_query) > 0): ?>
            <?php while($assessment = mysqli_fetch_assoc($assessments_query)): 
                $submission_percentage = $assessment['total_submissions'] > 0 ? ($assessment['graded_submissions'] / $assessment['total_submissions']) * 100 : 0;
            ?>
                <div class="assessment-card">
                    <div class="card-header-custom">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h4 class="mb-1"><?php echo htmlspecialchars($assessment['title']); ?></h4>
                                <small class="text-muted">
                                    <i class="fas fa-chalkboard"></i> <?php echo htmlspecialchars($assessment['class_name']); ?> |
                                    <i class="fas fa-star"></i> <?php echo $assessment['total_marks']; ?> marks |
                                    <i class="fas fa-question-circle"></i> <?php echo $assessment['total_questions']; ?> questions
                                </small>
                            </div>
                            <div>
                                <span class="status-badge status-<?php echo $assessment['status']; ?>">
                                    <i class="fas <?php echo $assessment['status'] == 'published' ? 'fa-check-circle' : 'fa-pencil-alt'; ?>"></i>
                                    <?php echo ucfirst($assessment['status']); ?>
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="card-body-custom">
                        <div class="row">
                            <div class="col-md-3">
                                <div class="text-center">
                                    <div class="stat-number"><?php echo $assessment['total_submissions']; ?></div>
                                    <div class="stat-label">Total Submissions</div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="text-center">
                                    <div class="stat-number"><?php echo $assessment['graded_submissions']; ?></div>
                                    <div class="stat-label">Graded</div>
                                    <div class="progress-custom mt-1">
                                        <div class="progress-fill" style="width: <?php echo $submission_percentage; ?>%"></div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="text-center">
                                    <div class="stat-number"><?php echo date('M d', strtotime($assessment['start_date'])); ?></div>
                                    <div class="stat-label">Start Date</div>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="text-center">
                                    <div class="stat-number"><?php echo date('M d', strtotime($assessment['end_date'])); ?></div>
                                    <div class="stat-label">End Date</div>
                                </div>
                            </div>
                        </div>
                        
                        <hr>
                        
                        <div class="d-flex justify-content-end gap-2">
                            <?php if($assessment['status'] == 'draft'): ?>
                                <a href="add_questions.php?id=<?php echo $assessment['assessment_id']; ?>" class="btn btn-outline-primary btn-sm">
                                    <i class="fas fa-plus"></i> Add/Edit Questions
                                </a>
                                <a href="?publish=<?php echo $assessment['assessment_id']; ?>" class="btn btn-green btn-sm" onclick="return confirm('Publish this assessment?')">
                                    <i class="fas fa-globe"></i> Publish
                                </a>
                                <a href="?delete=<?php echo $assessment['assessment_id']; ?>" class="btn btn-outline-danger btn-sm" onclick="return confirm('Delete this assessment?')">
                                    <i class="fas fa-trash"></i> Delete
                                </a>
                            <?php elseif($assessment['status'] == 'published'): ?>
                                <a href="view_submissions.php?aid=<?php echo $assessment['assessment_id']; ?>" class="btn btn-green btn-sm">
                                    <i class="fas fa-graduation-cap"></i> View Submissions (<?php echo $assessment['total_submissions']; ?>)
                                </a>
                                <a href="?unpublish=<?php echo $assessment['assessment_id']; ?>" class="btn btn-outline-warning btn-sm" onclick="return confirm('Unpublish this assessment?')">
                                    <i class="fas fa-ban"></i> Unpublish
                                </a>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
            <?php endwhile; ?>
        <?php else: ?>
            <div class="text-center p-5 bg-white rounded">
                <i class="fas fa-tasks fa-4x text-muted mb-3"></i>
                <h4>No Assessments Yet</h4>
                <p>Create your first assessment to get started.</p>
                <a href="create_assessment.php" class="btn btn-green">Create Assessment</a>
            </div>
        <?php endif; ?>
    </div>
</body>
</html>