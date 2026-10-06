import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../api/client';

export default function Landing() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [expandedResource, setExpandedResource] = useState(null);
  const [resourcesTab, setResourcesTab] = useState('students');
  const [resourcesCategory, setResourcesCategory] = useState('all');
  const [resourcesSearch, setResourcesSearch] = useState('');
  const modalRef = useRef(null);

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    if (hash) setActiveSection(hash);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setLoginModalOpen(false);
        setLoginError('');
        setLoginForm({ username: '', password: '' });
      }
    };

    if (loginModalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [loginModalOpen]);

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && loginModalOpen) {
        setLoginModalOpen(false);
        setLoginError('');
        setLoginForm({ username: '', password: '' });
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [loginModalOpen]);

  const showSection = (sectionId) => {
    setActiveSection(sectionId);
    setMobileMenuOpen(false);
    window.location.hash = sectionId;
  };

  const Section = ({ id, children }) => (
    <section id={id} className={`${activeSection === id ? 'block' : 'hidden'}`}>
      {children}
    </section>
  );

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const response = await apiFetch('/api/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({
          username: loginForm.username,
          password: loginForm.password
        })
      });

      if (response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        setLoginModalOpen(false);
        setLoginForm({ username: '', password: '' });
        
        if (response.user?.position === 3) {
          navigate('/dod');
        } else {
          navigate('/admin/home');
        }
      } else {
        setLoginError('Invalid credentials. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setLoginForm({
      ...loginForm,
      [e.target.name]: e.target.value
    });
    if (loginError) setLoginError('');
  };

  // Resources Data
  const studentResources = [
    {
      id: 1,
      title: "Blockchain for Beginners",
      category: "blockchain",
      level: "Beginner",
      duration: "4 weeks",
      description: "Learn the fundamentals of blockchain technology, smart contracts, and decentralized applications.",
      content: "What you'll learn:\n• Understanding blockchain architecture and consensus mechanisms\n• Creating your first smart contract using Solidity\n• Building a simple DApp with Web3.js\n• Exploring real-world blockchain applications in education\n\nLearning Path:\n1. Start with Bitcoin whitepaper and basic cryptography concepts\n2. Practice on Remix IDE for smart contract development\n3. Join blockchain hackathons and online communities\n4. Build a portfolio project like a certificate verification system"
    },
    {
      id: 2,
      title: "Master React.js",
      category: "reactjs",
      level: "Intermediate",
      duration: "6 weeks",
      description: "Comprehensive guide to building modern web applications with React.js.",
      content: "What you'll learn:\n• React fundamentals: components, props, state, and hooks\n• Building responsive UIs with Tailwind CSS\n• State management with Redux and Context API\n• Connecting React to backend APIs\n\nStudy Plan:\nWeek 1-2: Master JavaScript ES6+ and React basics\nWeek 3-4: Build 3 mini-projects (Todo app, Weather app, E-commerce cart)\nWeek 5-6: Complete a full-stack project with Node.js backend"
    },
    {
      id: 3,
      title: "Machine Learning Fundamentals",
      category: "ml",
      level: "Advanced",
      duration: "8 weeks",
      description: "Introduction to machine learning algorithms and practical applications.",
      content: "Prerequisites:\n• Python programming basics\n• Linear algebra and statistics knowledge\n\nLearning Path:\n1. Complete Andrew Ng's Machine Learning course on Coursera\n2. Practice with Scikit-learn and TensorFlow\n3. Participate in Kaggle competitions\n4. Build a capstone project\n\nAI Tools for Students:\n• ChatGPT for explaining complex concepts\n• GitHub Copilot for code suggestions\n• Google Colab for free GPU computing"
    },
    {
      id: 4,
      title: "Python Programming Mastery",
      category: "python",
      level: "Beginner",
      duration: "5 weeks",
      description: "From zero to hero - complete Python programming guide.",
      content: "Course Outline:\n• Python syntax and data structures\n• Functions, modules, and packages\n• Object-oriented programming\n• File handling and error management\n• Introduction to data science libraries\n\nStudy Tips:\n• Practice on HackerRank and LeetCode daily\n• Build automation scripts for your daily tasks\n• Create a portfolio of 10+ Python projects"
    },
    {
      id: 5,
      title: "JavaScript: The Complete Guide",
      category: "javascript",
      level: "Beginner",
      duration: "4 weeks",
      description: "Master JavaScript from fundamentals to advanced concepts.",
      content: "Topics Covered:\n• ES6+ features (arrow functions, destructuring, spread operators)\n• Asynchronous JavaScript (Promises, async/await)\n• DOM manipulation and event handling\n• API integration with Fetch and Axios\n\nLearning Resources:\n• JavaScript.info - Comprehensive reference\n• FreeCodeCamp's JavaScript Algorithms\n• JavaScript30 - 30-day vanilla JS challenge"
    },
    {
      id: 6,
      title: "Database Design and Management",
      category: "databases",
      level: "Intermediate",
      duration: "4 weeks",
      description: "Learn SQL, NoSQL, and database optimization techniques.",
      content: "What you'll master:\n• SQL queries (SELECT, JOIN, GROUP BY, subqueries)\n• Database normalization and design patterns\n• Indexing and query optimization\n• MongoDB and document-based databases\n\nPractical Exercises:\n• Design a school management database schema\n• Optimize slow queries using EXPLAIN\n• Implement database triggers and stored procedures"
    }
  ];

  const teacherResources = [
    {
      id: 1,
      title: "Using AI to Create Lesson Plans",
      category: "ai",
      description: "Leverage AI tools to generate comprehensive lesson plans and teaching materials.",
      content: "AI Tools for Lesson Planning:\n• ChatGPT/Claude: Generate lesson objectives, activities, and assessments\n• Education Copilot: AI-powered lesson plan generator\n• Curipod: Create interactive presentations with AI\n\nPrompt Engineering for Teachers:\n• 'Create a 60-minute lesson plan for teaching React components to beginners'\n• 'Generate 10 multiple-choice questions about blockchain consensus mechanisms'\n• 'Design a project-based assessment for Python data structures'\n\nBest Practices:\n• Always review and customize AI-generated content\n• Combine AI suggestions with your expertise\n• Use AI to differentiate instruction for diverse learners"
    },
    {
      id: 2,
      title: "Pedagogical Document Preparation",
      category: "ai",
      description: "AI-assisted creation of syllabi, rubrics, and assessment materials.",
      content: "Documents You Can Create with AI:\n• Course Syllabi: Learning outcomes, weekly schedule, grading policy\n• Assessment Rubrics: Detailed criteria for project evaluation\n• Progress Reports: Automated student performance summaries\n• Study Guides: Condensed topic summaries\n\nSyllabus Template Prompt:\n'Create a 12-week syllabus for an Introduction to Machine Learning course. Include learning objectives, weekly topics, assignments, grading breakdown (40% projects, 30% exams, 20% quizzes, 10% participation).'"
    },
    {
      id: 3,
      title: "Personalized Learning with AI",
      category: "ai",
      description: "Use AI to create adaptive learning paths for students.",
      content: "Implementation Strategies:\n• Intelligent Tutoring Systems: Provide personalized hints\n• Adaptive Assessments: Questions adjust based on performance\n• Learning Analytics: Track student progress\n• Content Recommendation: Suggest resources based on learning style\n\nPractical Tips:\n• Use AI to generate differentiated assignments\n• Create personalized study plans based on quiz results\n• Automate progress tracking and intervention alerts"
    },
    {
      id: 4,
      title: "Blockchain in Education",
      category: "blockchain",
      description: "Implement blockchain for credential verification and academic records.",
      content: "Educational Applications:\n• Digital Diplomas: Tamper-proof certificate issuance\n• Transcript Management: Decentralized academic records\n• Micro-credentials: Skill-based badges on blockchain\n\nImplementation Guide:\n1. Choose a blockchain platform (Ethereum, Hyperledger, or Stellar)\n2. Design smart contracts for credential issuance\n3. Develop a verification portal for employers\n\nCase Studies:\n• MIT's Blockcerts - Digital diploma project\n• University of Nicosia - Blockchain degrees"
    },
    {
      id: 5,
      title: "Gamification in Programming Education",
      category: "reactjs",
      description: "Engage students through game-based learning techniques.",
      content: "Gamification Strategies:\n• Points and Badges: Reward code completion\n• Leaderboards: Friendly competition\n• Levels and Quests: Progressive challenges\n\nTools and Platforms:\n• CodeCombat: Learn programming through gaming\n• Codewars: Rank-based coding challenges\n• GitHub Classroom: Automated assignment tracking\n\nImplementation Tips:\n• Create themed coding competitions\n• Implement peer review systems\n• Celebrate achievements with certificates"
    },
    {
      id: 6,
      title: "Project-Based Learning Framework",
      category: "javascript",
      description: "Structure real-world projects that build portfolio-ready skills.",
      content: "PBL Framework:\nPhase 1 - Discovery: Problem identification\nPhase 2 - Planning: Technical architecture\nPhase 3 - Development: Agile implementation\nPhase 4 - Testing: Quality assurance\nPhase 5 - Deployment: Production release\nPhase 6 - Presentation: Demo day\n\nSample Projects:\n• Beginner: Personal portfolio website\n• Intermediate: E-commerce store\n• Advanced: Learning management system"
    }
  ];

  const getFilteredResources = () => {
    const resources = resourcesTab === 'students' ? studentResources : teacherResources;
    return resources.filter(resource => {
      const matchesCategory = resourcesCategory === 'all' || resource.category === resourcesCategory;
      const matchesSearch = resource.title.toLowerCase().includes(resourcesSearch.toLowerCase()) ||
                           resource.description.toLowerCase().includes(resourcesSearch.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  };

  return (
    <>
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-40 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              <button onClick={() => showSection('home')} className="text-2xl font-bold">
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">FutureKing</span>
                <span className="text-sm font-normal text-gray-500 ml-2">Technologies</span>
              </button>
            </div>

            <div className="hidden md:flex items-center space-x-1">
              {['home', 'services', 'blockchain', 'ai-ml', 'training', 'resources', 'contact'].map((section) => (
                <button
                  key={section}
                  onClick={() => showSection(section)}
                  className={`px-4 py-2 font-medium rounded-lg transition ${
                    activeSection === section
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  {section === 'ai-ml' ? 'AI & ML' : section === 'resources' ? 'Resources' : section.charAt(0).toUpperCase() + section.slice(1)}
                </button>
              ))}
              <button
                onClick={() => setLoginModalOpen(true)}
                className="ml-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-5 py-2 rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition-all"
              >
                <i className="fas fa-sign-in-alt mr-2"></i>Portal Login
              </button>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              <i className="fas fa-bars text-xl"></i>
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white">
            <div className="px-4 py-3 space-y-2">
              {['home', 'services', 'blockchain', 'ai-ml', 'training', 'resources', 'contact'].map((section) => (
                <button
                  key={section}
                  onClick={() => showSection(section)}
                  className={`block w-full text-left px-4 py-2 font-medium rounded-lg transition ${
                    activeSection === section
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  {section === 'ai-ml' ? 'AI & ML' : section === 'resources' ? 'Resources' : section.charAt(0).toUpperCase() + section.slice(1)}
                </button>
              ))}
              <button
                onClick={() => {
                  setLoginModalOpen(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-5 py-2 rounded-lg font-semibold"
              >
                <i className="fas fa-sign-in-alt mr-2"></i>Portal Login
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Login Modal */}
      {loginModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div ref={modalRef} className="bg-white rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">Administrative Login</h2>
              <button 
                onClick={() => {
                  setLoginModalOpen(false);
                  setLoginError('');
                  setLoginForm({ username: '', password: '' });
                }} 
                className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center transition"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <form onSubmit={handleAdminLogin} className="p-6 space-y-4">
              {loginError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  <i className="fas fa-exclamation-circle mr-2"></i>
                  {loginError}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  name="username" 
                  value={loginForm.username}
                  onChange={handleInputChange}
                  placeholder="Enter your username" 
                  required 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password <span className="text-red-500">*</span></label>
                <input 
                  type={showPassword ? "text" : "password"} 
                  name="password" 
                  value={loginForm.password}
                  onChange={handleInputChange}
                  placeholder="Enter your password" 
                  required 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="showPassword" 
                  onChange={(e) => setShowPassword(e.target.checked)} 
                  className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                />
                <label htmlFor="showPassword" className="ml-2 text-sm text-gray-600 cursor-pointer">Show Password</label>
              </div>
              
              <button 
                type="submit" 
                disabled={loginLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loginLoading ? (
                  <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Logging in...</>
                ) : (
                  <><i className="fas fa-sign-in-alt"></i>Login</>
                )}
              </button>
            </form>
            
            <div className="p-6 pt-0 border-t mt-2">
              <div className="flex justify-between text-sm">
                <Link to="/login/student" className="text-blue-600 hover:underline" onClick={() => setLoginModalOpen(false)}>
                  <i className="fas fa-user-graduate mr-1"></i> Student Portal
                </Link>
                <Link to="/login/teacher" className="text-blue-600 hover:underline" onClick={() => setLoginModalOpen(false)}>
                  <i className="fas fa-chalkboard-teacher mr-1"></i> Teachers' Portal
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main>
        {/* Home Section */}
        <Section id="home">
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600">
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="text-white">
                  <span className="inline-block px-4 py-2 rounded-full bg-white/20 text-white text-sm font-semibold mb-6">
                    <i className="fas fa-crown mr-2"></i>Empowering Tech Innovation
                  </span>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 leading-tight">
                    Master <span className="text-yellow-300">Blockchain</span>, <span className="text-yellow-300">AI</span> & <span className="text-yellow-300">ML</span>
                  </h1>
                  <p className="text-xl text-white/90 mb-8 leading-relaxed">
                    Premier ICT training and software development company in East Africa.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <button onClick={() => showSection('training')} className="bg-white text-blue-600 px-8 py-4 rounded-xl font-bold hover:shadow-2xl hover:scale-105 transition-all">
                      <i className="fas fa-graduation-cap mr-2"></i>Start Learning
                    </button>
                    <button onClick={() => showSection('resources')} className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-xl font-bold hover:bg-white hover:text-purple-600 transition-all">
                      <i className="fas fa-book-open mr-2"></i>Resources
                    </button>
                  </div>
                </div>

                <div className="hidden md:block">
                  <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { icon: 'fab fa-bitcoin', label: 'Blockchain' },
                        { icon: 'fas fa-brain', label: 'AI' },
                        { icon: 'fas fa-robot', label: 'ML' },
                        { icon: 'fab fa-python', label: 'Python' },
                        { icon: 'fab fa-js', label: 'JavaScript' },
                        { icon: 'fas fa-database', label: 'SQL' }
                      ].map((tech, idx) => (
                        <div key={idx} className="text-center p-4 bg-white/10 rounded-xl">
                          <i className={`${tech.icon} text-3xl text-white mb-2`}></i>
                          <p className="text-white text-sm">{tech.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { section: 'services', icon: 'fa-laptop-code', color: 'blue', title: 'Services' },
                { section: 'blockchain', icon: 'fa-bitcoin', color: 'purple', title: 'Blockchain' },
                { section: 'ai-ml', icon: 'fa-brain', color: 'pink', title: 'AI & ML' },
                { section: 'resources', icon: 'fa-book-open', color: 'green', title: 'Resources' }
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => showSection(item.section)}
                  className="bg-white p-8 rounded-2xl text-center hover:shadow-xl transition-all transform hover:-translate-y-1 border"
                >
                  <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white text-3xl">
                    <i className={`fas ${item.icon}`}></i>
                  </div>
                  <h3 className="font-semibold text-gray-900">{item.title}</h3>
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* Services Section */}
        <Section id="services">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Our Services</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">End-to-end ICT solutions</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { icon: 'fa-code', title: 'Custom Software', desc: 'Enterprise applications' },
                { icon: 'fa-mobile-alt', title: 'Mobile Apps', desc: 'Cross-platform solutions' },
                { icon: 'fa-bitcoin', title: 'Blockchain', desc: 'Web3 & Smart Contracts' },
                { icon: 'fa-brain', title: 'AI Solutions', desc: 'Intelligent systems' },
                { icon: 'fa-cloud', title: 'Cloud Services', desc: 'AWS, Azure, GCP' },
                { icon: 'fa-robot', title: 'Machine Learning', desc: 'Predictive models' }
              ].map((service, idx) => (
                <div key={idx} className="bg-white rounded-2xl shadow-lg p-8 text-center hover:shadow-2xl transition-all">
                  <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-6 text-blue-600 text-3xl">
                    <i className={`fas ${service.icon}`}></i>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{service.title}</h3>
                  <p className="text-gray-600">{service.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Resources Section */}
        <Section id="resources">
          <div className="bg-gray-50 py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Learning Resources</h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  Guides and resources for students and teachers
                </p>
              </div>

              {/* Tab Switcher */}
              <div className="flex justify-center gap-4 mb-8">
                <button
                  onClick={() => { setResourcesTab('students'); setResourcesCategory('all'); setResourcesSearch(''); }}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                    resourcesTab === 'students' 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'bg-white text-gray-700 hover:bg-gray-100 border'
                  }`}
                >
                  <i className="fas fa-users mr-2"></i>For Students
                </button>
                <button
                  onClick={() => { setResourcesTab('teachers'); setResourcesCategory('all'); setResourcesSearch(''); }}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                    resourcesTab === 'teachers' 
                      ? 'bg-purple-600 text-white shadow-lg' 
                      : 'bg-white text-gray-700 hover:bg-gray-100 border'
                  }`}
                >
                  <i className="fas fa-chalkboard-teacher mr-2"></i>For Teachers
                </button>
              </div>

              {/* Category Filters */}
              <div className="flex flex-wrap justify-center gap-3 mb-8">
                <button
                  onClick={() => setResourcesCategory('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    resourcesCategory === 'all' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-gray-700 hover:bg-gray-100 border'
                  }`}
                >
                  All
                </button>
                <button onClick={() => setResourcesCategory('blockchain')} className="px-4 py-2 rounded-lg font-medium bg-white border hover:bg-gray-100">Blockchain</button>
                <button onClick={() => setResourcesCategory('reactjs')} className="px-4 py-2 rounded-lg font-medium bg-white border hover:bg-gray-100">React.js</button>
                <button onClick={() => setResourcesCategory('ml')} className="px-4 py-2 rounded-lg font-medium bg-white border hover:bg-gray-100">Machine Learning</button>
                <button onClick={() => setResourcesCategory('python')} className="px-4 py-2 rounded-lg font-medium bg-white border hover:bg-gray-100">Python</button>
                <button onClick={() => setResourcesCategory('javascript')} className="px-4 py-2 rounded-lg font-medium bg-white border hover:bg-gray-100">JavaScript</button>
                <button onClick={() => setResourcesCategory('databases')} className="px-4 py-2 rounded-lg font-medium bg-white border hover:bg-gray-100">Databases</button>
                <button onClick={() => setResourcesCategory('ai')} className="px-4 py-2 rounded-lg font-medium bg-white border hover:bg-gray-100">AI in Education</button>
              </div>

              {/* Search Bar */}
              <div className="relative max-w-md mx-auto mb-10">
                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                <input
                  type="text"
                  placeholder="Search resources..."
                  value={resourcesSearch}
                  onChange={(e) => setResourcesSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* AI Tips Banner */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 mb-10">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-robot text-white text-xl"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-indigo-900 mb-2">🤖 AI-Powered Learning Tips</h3>
                    <p className="text-indigo-800">
                      {resourcesTab === 'students' 
                        ? "Use ChatGPT to explain complex concepts, generate practice problems, and review your code. GitHub Copilot helps with coding assistance."
                        : "Use AI to generate lesson plans, create assessments, provide personalized feedback, and analyze student performance data."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Resources Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {getFilteredResources().map((resource) => (
                  <div key={resource.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all">
                    <div className="p-6">
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                          {resource.category.toUpperCase()}
                        </span>
                        {resource.level && (
                          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">{resource.level}</span>
                        )}
                        {resource.duration && (
                          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                            <i className="far fa-clock mr-1"></i>{resource.duration}
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{resource.title}</h3>
                      <p className="text-gray-600 mb-4">{resource.description}</p>
                      
                      <button
                        onClick={() => setExpandedResource(expandedResource === resource.id ? null : resource.id)}
                        className="text-blue-600 font-semibold hover:text-blue-700 transition flex items-center gap-1"
                      >
                        {expandedResource === resource.id ? 'Show Less' : 'View Guide'}
                        <i className={`fas fa-chevron-${expandedResource === resource.id ? 'up' : 'down'} text-sm`}></i>
                      </button>
                      
                      {expandedResource === resource.id && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="text-gray-700 whitespace-pre-line">{resource.content}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {getFilteredResources().length === 0 && (
                <div className="text-center py-12">
                  <i className="fas fa-search text-5xl text-gray-300 mb-4"></i>
                  <p className="text-gray-500">No resources found. Try adjusting your search.</p>
                </div>
              )}

              {/* Quick Tips */}
              <div className="mt-12 bg-white rounded-2xl shadow-lg p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                  {resourcesTab === 'students' ? '🚀 Quick Tips for Success' : '📖 Quick Tips for Teachers'}
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {resourcesTab === 'students' ? [
                    'Code for 30 minutes daily',
                    'Join developer communities',
                    'Build real projects',
                    'Teach others to learn better',
                    'Join coding competitions',
                    'Document your learning journey'
                  ] : [
                    'Use AI for lesson planning',
                    'Track student progress',
                    'Implement peer learning',
                    'Gamify your lessons',
                    'Use project-based learning',
                    'Gather feedback regularly'
                  ].map((tip, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <i className="fas fa-check-circle text-green-500"></i>
                      <span className="text-gray-700">{tip}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-center text-white">
                <i className="fas fa-graduation-cap text-4xl mb-4"></i>
                <h3 className="text-2xl font-bold mb-2">Ready to Start Learning?</h3>
                <p className="mb-6">Join our programs and master modern technologies</p>
                <Link to="/login/student" className="inline-block px-6 py-3 bg-white text-blue-600 rounded-xl font-semibold hover:shadow-lg transition">
                  Get Started <i className="fas fa-arrow-right ml-2"></i>
                </Link>
              </div>
            </div>
          </div>
        </Section>

        {/* Placeholder Sections */}
        <Section id="blockchain"><div className="py-20 text-center"><p className="text-gray-500">Blockchain content</p></div></Section>
        <Section id="ai-ml"><div className="py-20 text-center"><p className="text-gray-500">AI & ML content</p></div></Section>
        <Section id="training"><div className="py-20 text-center"><p className="text-gray-500">Training programs</p></div></Section>
        <Section id="contact">
          <div className="bg-gray-900 text-white py-20 text-center">
            <h2 className="text-4xl font-bold mb-4">Contact Us</h2>
            <p>Email: info@futurekingtech.org | Phone: +250 788 965 576</p>
          </div>
        </Section>
      </main>

      <footer className="bg-gray-950 text-gray-400 py-8 text-center">
        <p>&copy; 2025 FutureKing Technologies. All rights reserved.</p>
      </footer>
    </>
  );
}