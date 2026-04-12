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

// Get classes for filtering
$classes_query = mysqli_query($conn, "SELECT * FROM class WHERE tid='$tid'");

// Get filter parameters
$selected_class = isset($_GET['class']) ? $_GET['class'] : 0;
$selected_assessment = isset($_GET['assessment']) ? $_GET['assessment'] : 0;

// Get assessments for selected class
$assessments_list = [];
if ($selected_class) {
    $assessments_query = mysqli_query($conn, "
        SELECT * FROM assessments 
        WHERE cid='$selected_class' AND tid='$tid'
        ORDER BY created_at DESC
    ");
    while($assmt = mysqli_fetch_assoc($assessments_query)) {
        $assessments_list[] = $assmt;
    }
}

// Get detailed report for selected assessment
$report_data = null;
$students_results = [];
$statistics = [];

if ($selected_assessment) {
    // Get assessment info
    $assessment_info = mysqli_fetch_assoc(mysqli_query($conn, "
        SELECT a.*, c.class_name 
        FROM assessments a
        JOIN class c ON a.cid = c.cid
        WHERE a.assessment_id='$selected_assessment' AND a.tid='$tid'
    "));
    
    if ($assessment_info) {
        // Get all students in the class
        $class_info = mysqli_fetch_assoc(mysqli_query($conn, "SELECT class_name FROM class WHERE cid='{$assessment_info['cid']}'"));
        $class_name = $class_info['class_name'];
        
        $students_query = mysqli_query($conn, "
            SELECT s.sid, s.firstname, s.lastname, s.reg,
                   sub.submission_id, sub.submission_date, sub.obtained_marks, sub.status, sub.feedback
            FROM student s
            LEFT JOIN assessment_submissions sub ON s.sid = sub.sid AND sub.assessment_id='$selected_assessment'
            WHERE s.class = '$class_name'
            ORDER BY s.firstname
        ");
        
        $total_students = 0;
        $submitted_count = 0;
        $graded_count = 0;
        $total_marks_sum = 0;
        $max_marks = 0;
        $min_marks = $assessment_info['total_marks'];
        
        while($student = mysqli_fetch_assoc($students_query)) {
            $students_results[] = $student;
            $total_students++;
            
            if ($student['submission_id']) {
                $submitted_count++;
                if ($student['status'] == 'graded') {
                    $graded_count++;
                    $total_marks_sum += $student['obtained_marks'];
                    $max_marks = max($max_marks, $student['obtained_marks']);
                    $min_marks = min($min_marks, $student['obtained_marks']);
                }
            }
        }
        
        $statistics = [
            'total_students' => $total_students,
            'submitted_count' => $submitted_count,
            'graded_count' => $graded_count,
            'pending_grading' => $submitted_count - $graded_count,
            'not_submitted' => $total_students - $submitted_count,
            'average_marks' => $graded_count > 0 ? round($total_marks_sum / $graded_count, 2) : 0,
            'max_marks' => $max_marks,
            'min_marks' => $min_marks == $assessment_info['total_marks'] ? 0 : $min_marks,
            'passing_rate' => 0,
            'pass_count' => 0
        ];
        
        // Calculate passing rate
        foreach($students_results as $student) {
            if ($student['status'] == 'graded' && $student['obtained_marks'] >= $assessment_info['passing_marks']) {
                $statistics['pass_count']++;
            }
        }
        $statistics['passing_rate'] = $graded_count > 0 ? round(($statistics['pass_count'] / $graded_count) * 100, 1) : 0;
    }
}

// Get overall class performance for all assessments
$class_performance = [];
if ($selected_class) {
    $overall_query = mysqli_query($conn, "
        SELECT a.assessment_id, a.title, a.assessment_type, a.total_marks, a.passing_marks,
               COUNT(DISTINCT sub.submission_id) as submissions,
               AVG(sub.obtained_marks) as avg_marks,
               MIN(sub.obtained_marks) as min_marks,
               MAX(sub.obtained_marks) as max_marks,
               COUNT(CASE WHEN sub.obtained_marks >= a.passing_marks THEN 1 END) as passed_count
        FROM assessments a
        LEFT JOIN assessment_submissions sub ON a.assessment_id = sub.assessment_id
        WHERE a.cid='$selected_class' AND a.tid='$tid'
        GROUP BY a.assessment_id
        ORDER BY a.created_at DESC
    ");
    
    while($perf = mysqli_fetch_assoc($overall_query)) {
        $class_performance[] = $perf;
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Assessment Reports</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            background-color: #f5f5f5;
            padding: 20px;
        }
        
        .btn-green {
            background-color: rgb(8, 58, 8);
            color: white;
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
        
        .section-title {
            color: rgb(8, 58, 8);
            margin: 30px 0 20px 0;
            padding-bottom: 10px;
            border-bottom: 2px solid rgb(8, 58, 8);
        }
        
        .stat-card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .stat-number {
            font-size: 2rem;
            font-weight: bold;
            color: rgb(8, 58, 8);
        }
        
        .stat-label {
            color: #666;
            font-size: 0.85rem;
        }
        
        .report-card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .performance-table th {
            background-color: rgb(8, 58, 8);
            color: white;
        }
        
        .grade-A {
            color: #2e7d32;
            font-weight: bold;
        }
        
        .grade-B {
            color: #f57c00;
            font-weight: bold;
        }
        
        .grade-C {
            color: #c62828;
            font-weight: bold;
        }
        
        .filter-form {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .chart-container {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        canvas {
            max-height: 300px;
        }
        
        .export-buttons {
            margin-bottom: 20px;
        }
        
        @media print {
            .no-print {
                display: none;
            }
            body {
                background: white;
                padding: 0;
            }
            .btn, .filter-form, .export-buttons {
                display: none;
            }
        }
    </style>
</head>
<body>
    <div class="container-fluid">
        <h2 class="mb-4" style="color: rgb(8, 58, 8);">
            <i class="fas fa-chart-line"></i> Assessment Reports
        </h2>
        
        <!-- Filter Form -->
        <div class="filter-form no-print">
            <form method="GET" class="row g-3">
                <div class="col-md-5">
                    <label>Select Class</label>
                    <select name="class" class="form-control" required>
                        <option value="">Select Class</option>
                        <?php while($class = mysqli_fetch_assoc($classes_query)): ?>
                            <option value="<?php echo $class['cid']; ?>" <?php echo $selected_class == $class['cid'] ? 'selected' : ''; ?>>
                                <?php echo htmlspecialchars($class['class_name']); ?>
                            </option>
                        <?php endwhile; ?>
                    </select>
                </div>
                <div class="col-md-5">
                    <label>Select Assessment</label>
                    <select name="assessment" class="form-control">
                        <option value="">All Assessments</option>
                        <?php foreach($assessments_list as $assmt): ?>
                            <option value="<?php echo $assmt['assessment_id']; ?>" <?php echo $selected_assessment == $assmt['assessment_id'] ? 'selected' : ''; ?>>
                                <?php echo htmlspecialchars($assmt['title']); ?> (<?php echo ucfirst($assmt['assessment_type']); ?>)
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="col-md-2">
                    <label>&nbsp;</label>
                    <button type="submit" class="btn btn-green form-control">
                        <i class="fas fa-chart-line"></i> Generate Report
                    </button>
                </div>
            </form>
        </div>
        
        <?php if($selected_assessment && isset($assessment_info)): ?>
            <!-- Assessment Details -->
            <div class="report-card">
                <div class="row">
                    <div class="col-md-8">
                        <h4><?php echo htmlspecialchars($assessment_info['title']); ?></h4>
                        <p class="text-muted">
                            <i class="fas fa-chalkboard"></i> <?php echo $assessment_info['class_name']; ?>
                            | <i class="fas fa-tag"></i> <?php echo ucfirst($assessment_info['assessment_type']); ?>
                            | <i class="fas fa-star"></i> Total Marks: <?php echo $assessment_info['total_marks']; ?>
                            | <i class="fas fa-check-circle"></i> Passing: <?php echo $assessment_info['passing_marks']; ?> marks
                        </p>
                    </div>
                    <div class="col-md-4 text-md-end">
                        <button onclick="window.print()" class="btn btn-outline-green no-print">
                            <i class="fas fa-print"></i> Print Report
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Statistics Cards -->
            <div class="row">
                <div class="col-md-3">
                    <div class="stat-card">
                        <i class="fas fa-users fa-2x mb-2" style="color: rgb(8, 58, 8);"></i>
                        <div class="stat-number"><?php echo $statistics['total_students']; ?></div>
                        <div class="stat-label">Total Students</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stat-card">
                        <i class="fas fa-check-circle fa-2x mb-2" style="color: #4caf50;"></i>
                        <div class="stat-number"><?php echo $statistics['submitted_count']; ?></div>
                        <div class="stat-label">Submitted</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stat-card">
                        <i class="fas fa-chart-line fa-2x mb-2" style="color: #ff9800;"></i>
                        <div class="stat-number"><?php echo $statistics['average_marks']; ?></div>
                        <div class="stat-label">Average Marks</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stat-card">
                        <i class="fas fa-trophy fa-2x mb-2" style="color: #f44336;"></i>
                        <div class="stat-number"><?php echo $statistics['passing_rate']; ?>%</div>
                        <div class="stat-label">Passing Rate</div>
                    </div>
                </div>
            </div>
            
            <!-- Charts Row -->
            <div class="row">
                <div class="col-md-6">
                    <div class="chart-container">
                        <h6>Submission Status</h6>
                        <canvas id="submissionChart"></canvas>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="chart-container">
                        <h6>Score Distribution</h6>
                        <canvas id="scoreDistributionChart"></canvas>
                    </div>
                </div>
            </div>
            
            <!-- Student Results Table -->
            <div class="report-card">
                <h5>Student Performance Details</h5>
                <div class="table-responsive">
                    <table class="table table-bordered performance-table">
                        <thead>
                             <tr>
                                <th>#</th>
                                <th>Student Name</th>
                                <th>Reg Number</th>
                                <th>Status</th>
                                <th>Marks Obtained</th>
                                <th>Percentage</th>
                                <th>Grade</th>
                                <th>Feedback</th>
                             </tr>
                        </thead>
                        <tbody>
                            <?php 
                            $count = 1;
                            foreach($students_results as $student): 
                                $percentage = 0;
                                $grade = '';
                                $grade_class = '';
                                
                                if($student['status'] == 'graded') {
                                    $percentage = ($student['obtained_marks'] / $assessment_info['total_marks']) * 100;
                                    if ($percentage >= 80) {
                                        $grade = 'A';
                                        $grade_class = 'grade-A';
                                    } elseif ($percentage >= 70) {
                                        $grade = 'B';
                                        $grade_class = 'grade-B';
                                    } elseif ($percentage >= 50) {
                                        $grade = 'C';
                                        $grade_class = 'grade-C';
                                    } else {
                                        $grade = 'D';
                                        $grade_class = 'grade-C';
                                    }
                                }
                            ?>
                                <tr>
                                    <td><?php echo $count++; ?></td>
                                    <td><?php echo htmlspecialchars($student['firstname']." ".$student['lastname']); ?></td>
                                    <td><?php echo $student['reg']; ?></td>
                                    <td>
                                        <?php if($student['status'] == 'graded'): ?>
                                            <span class="badge bg-success">Graded</span>
                                        <?php elseif($student['submission_id']): ?>
                                            <span class="badge bg-warning">Submitted</span>
                                        <?php else: ?>
                                            <span class="badge bg-secondary">Not Submitted</span>
                                        <?php endif; ?>
                                    </td>
                                    <td>
                                        <?php if($student['status'] == 'graded'): ?>
                                            <?php echo $student['obtained_marks']; ?> / <?php echo $assessment_info['total_marks']; ?>
                                        <?php elseif($student['submission_id']): ?>
                                            Pending Grading
                                        <?php else: ?>
                                            -
                                        <?php endif; ?>
                                    </td>
                                    <td class="<?php echo $grade_class; ?>">
                                        <?php if($student['status'] == 'graded'): ?>
                                            <?php echo number_format($percentage, 1); ?>%
                                        <?php else: ?>
                                            -
                                        <?php endif; ?>
                                    </td>
                                    <td class="<?php echo $grade_class; ?>">
                                        <?php if($student['status'] == 'graded'): ?>
                                            <?php echo $grade; ?>
                                        <?php else: ?>
                                            -
                                        <?php endif; ?>
                                    </td>
                                    <td><?php echo htmlspecialchars($student['feedback']); ?></td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            </div>
            
        <?php elseif($selected_class && !$selected_assessment): ?>
            <!-- Overall Class Performance -->
            <h4 class="section-title">
                <i class="fas fa-chart-bar"></i> Overall Class Performance
            </h4>
            
            <?php if(count($class_performance) > 0): ?>
                <div class="table-responsive">
                    <table class="table table-bordered performance-table">
                        <thead>
                            <tr>
                                <th>Assessment</th>
                                <th>Type</th>
                                <th>Total Marks</th>
                                <th>Submissions</th>
                                <th>Average Score</th>
                                <th>Highest Score</th>
                                <th>Lowest Score</th>
                                <th>Passing Rate</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach($class_performance as $perf): 
                                $pass_rate = $perf['submissions'] > 0 ? round(($perf['passed_count'] / $perf['submissions']) * 100, 1) : 0;
                            ?>
                                <tr>
                                    <td><?php echo htmlspecialchars($perf['title']); ?></td>
                                    <td><?php echo ucfirst($perf['assessment_type']); ?></td>
                                    <td><?php echo $perf['total_marks']; ?></td>
                                    <td><?php echo $perf['submissions']; ?></td>
                                    <td><?php echo round($perf['avg_marks'], 2); ?></td>
                                    <td><?php echo $perf['max_marks']; ?></td>
                                    <td><?php echo $perf['min_marks']; ?></td>
                                    <td>
                                        <div class="progress" style="height: 20px;">
                                            <div class="progress-bar bg-success" role="progressbar" 
                                                 style="width: <?php echo $pass_rate; ?>%">
                                                <?php echo $pass_rate; ?>%
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <a href="?class=<?php echo $selected_class; ?>&assessment=<?php echo $perf['assessment_id']; ?>" 
                                           class="btn btn-sm btn-outline-green">
                                            <i class="fas fa-chart-line"></i> View Details
                                        </a>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            <?php else: ?>
                <div class="text-center p-5">
                    <i class="fas fa-chart-line fa-3x text-muted mb-3"></i>
                    <p>No assessments found for this class.</p>
                    <a href="create_assessment.php" class="btn btn-green">Create Assessment</a>
                </div>
            <?php endif; ?>
            
        <?php elseif($selected_class): ?>
            <div class="text-center p-5">
                <i class="fas fa-chart-line fa-3x text-muted mb-3"></i>
                <p>Please select an assessment to view detailed report.</p>
            </div>
            
        <?php else: ?>
            <div class="text-center p-5">
                <i class="fas fa-chart-line fa-3x text-muted mb-3"></i>
                <p>Please select a class to view assessment reports.</p>
            </div>
        <?php endif; ?>
    </div>
    
    <?php if($selected_assessment && isset($assessment_info)): ?>
    <script>
        // Submission Status Chart
        const submissionCtx = document.getElementById('submissionChart').getContext('2d');
        new Chart(submissionCtx, {
            type: 'doughnut',
            data: {
                labels: ['Graded (<?php echo $statistics['graded_count']; ?>)', 
                         'Pending Grading (<?php echo $statistics['pending_grading']; ?>)',
                         'Not Submitted (<?php echo $statistics['not_submitted']; ?>)'],
                datasets: [{
                    data: [<?php echo $statistics['graded_count']; ?>, 
                           <?php echo $statistics['pending_grading']; ?>, 
                           <?php echo $statistics['not_submitted']; ?>],
                    backgroundColor: ['#4caf50', '#ff9800', '#9e9e9e'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
        
        // Score Distribution Chart
        const scoreData = {
            labels: ['0-20%', '21-40%', '41-60%', '61-80%', '81-100%'],
            counts: [0, 0, 0, 0, 0]
        };
        
        <?php foreach($students_results as $student): 
            if($student['status'] == 'graded'):
                $percentage = ($student['obtained_marks'] / $assessment_info['total_marks']) * 100;
                if($percentage <= 20) echo "scoreData.counts[0]++;";
                elseif($percentage <= 40) echo "scoreData.counts[1]++;";
                elseif($percentage <= 60) echo "scoreData.counts[2]++;";
                elseif($percentage <= 80) echo "scoreData.counts[3]++;";
                else echo "scoreData.counts[4]++;";
            endif;
        endforeach; ?>
        
        const distributionCtx = document.getElementById('scoreDistributionChart').getContext('2d');
        new Chart(distributionCtx, {
            type: 'bar',
            data: {
                labels: scoreData.labels,
                datasets: [{
                    label: 'Number of Students',
                    data: scoreData.counts,
                    backgroundColor: 'rgb(8, 58, 8)',
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    </script>
    <?php endif; ?>
</body>
</html>