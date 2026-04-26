import { useState, useEffect } from 'react'
import './App.css'
import {
  FaHeart, FaBrain, FaLungs, FaBone, FaChild, FaUserNurse,
  FaBookMedical, FaSyringe, FaStethoscope, FaNotesMedical,
  FaTrophy, FaFire, FaStar, FaCheckCircle, FaTimesCircle,
  FaArrowLeft, FaArrowRight, FaHome, FaRedo, FaHistory,
  FaTrash, FaQuestionCircle, FaGraduationCap, FaChartLine,
  FaEye, FaHandHoldingMedical, FaShieldVirus, FaBaby,
  FaCut, FaRibbon, FaBalanceScale, FaAppleAlt, FaRunning,
  FaAllergies, FaBacteria, FaTint, FaThermometerHalf,
  FaPlayCircle, FaSave
} from 'react-icons/fa'
import { GiKidneys, GiStomach, GiMedicines, GiNurseFemale, GiSkeletonInside } from 'react-icons/gi'
import { MdQuiz, MdPlayArrow, MdBloodtype, MdOutlineElderly } from 'react-icons/md'
import { BiBody } from 'react-icons/bi'

// 問題データをインポート（Notionから取得したデータ）
// データがない場合はサンプルデータを使用
const sampleData = {
  categories: [
    { id: '1', name: '循環器系', questionCount: 2 }
  ],
  questions: [
    {
      id: '1',
      category: '循環器系',
      question: 'ループ系利尿薬とジギタリス製剤を服用している。\n最も注意すべき血液検査項目はどれか。',
      choices: ['カリウム値', 'カルシウム値', 'ビリルビン値', 'クレアチニン値'],
      answer: 0,
      explanation: 'ループ系利尿薬は低カリウム血症を引き起こしやすく、低カリウム血症はジギタリス中毒を誘発するため、カリウム値の監視が重要です。',
      tags: ['心不全']
    },
    {
      id: '2',
      category: '循環器系',
      question: '心臓の右心室から出る血管はどれか。',
      choices: ['大動脈', '肺動脈', '肺静脈', '大静脈'],
      answer: 1,
      explanation: '右心室からは肺動脈が出て、肺へ静脈血を送ります。',
      tags: ['心臓の構造']
    }
  ]
}

// カテゴリーアイコンのマッピング
const categoryIcons = {
  // 身体系統
  '循環器系': FaHeart,
  '呼吸器系': FaLungs,
  '消化器系': GiStomach,
  '泌尿器系': GiKidneys,
  '内分泌・代謝系': FaThermometerHalf,
  '血液・造血器系': FaTint,
  '脳神経系': FaBrain,
  '運動器系': FaRunning,
  '感覚器系': FaEye,
  '皮膚科': FaHandHoldingMedical,
  '免疫・アレルギー・膠原病': FaAllergies,
  '感染症': FaShieldVirus,
  '生殖器系': FaBaby,
  // 看護分野
  '周手術期看護': FaCut,
  'がん看護': FaRibbon,
  '母性看護': FaUserNurse,
  '小児看護': FaChild,
  '精神看護': FaBrain,
  '老年看護': MdOutlineElderly,
  '在宅・地域看護': FaHome,
  '看護技術・基礎': FaBookMedical,
  '法律・制度': FaBalanceScale,
  '栄養代謝': FaAppleAlt,
  // デフォルト
  'default': FaQuestionCircle
}

// カテゴリーアイコンを取得
const getCategoryIcon = (categoryName) => {
  return categoryIcons[categoryName] || categoryIcons['default']
}

// 長いカテゴリー名を短縮表示するマッピング
const categoryShortNames = {
  '免疫・アレルギー・膠原病': '免疫アレルギー膠原病',
}
const getDisplayName = (name) => categoryShortNames[name] || name

// ローカルストレージのキー
const STORAGE_KEYS = {
  HISTORY: 'nursing-quiz-history',
  WRONG_ANSWERS: 'nursing-quiz-wrong',
  STATS: 'nursing-quiz-stats',
  ANSWERED: 'nursing-quiz-answered',  // 回答済み問題
  CATEGORY_PROGRESS: 'nursing-quiz-category-progress'  // カテゴリーごとの進捗 { "脳神経系": 2 }
}

// ローカルストレージ操作
const storage = {
  get: (key) => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : null
    } catch {
      return null
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      console.error('Failed to save to localStorage')
    }
  }
}

function App() {
  const [data, setData] = useState(null)
  const [screen, setScreen] = useState('home') // home, category, quiz, result, history, wrong
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState([])  // 複数選択対応
  const [showExplanation, setShowExplanation] = useState(false)
  const [score, setScore] = useState(0)
  const [answers, setAnswers] = useState([])
  const [quizQuestions, setQuizQuestions] = useState([])
  const [stats, setStats] = useState({ totalQuizzes: 0, totalCorrect: 0, totalQuestions: 0 })
  const [history, setHistory] = useState([])
  const [wrongAnswers, setWrongAnswers] = useState([])
  const [answeredQuestions, setAnsweredQuestions] = useState([])  // 回答済み問題ID
  const [categoryProgress, setCategoryProgress] = useState({})  // カテゴリーごとの進捗
  const [showContinueModal, setShowContinueModal] = useState(false)  // 続きから/最初からモーダル
  const [pendingCategory, setPendingCategory] = useState(null)  // モーダル表示中のカテゴリー
  const [showHelp, setShowHelp] = useState(false)  // ヘルプモーダル

  // データと保存データを読み込み
  useEffect(() => {
    // 問題データ読み込み
    import('./data/questions.json')
      .then(module => setData(module.default))
      .catch(() => setData(sampleData))

    // 保存データ読み込み
    const savedStats = storage.get(STORAGE_KEYS.STATS)
    const savedHistory = storage.get(STORAGE_KEYS.HISTORY)
    const savedWrong = storage.get(STORAGE_KEYS.WRONG_ANSWERS)
    const savedAnswered = storage.get(STORAGE_KEYS.ANSWERED)
    const savedCategoryProgress = storage.get(STORAGE_KEYS.CATEGORY_PROGRESS)

    if (savedStats) setStats(savedStats)
    if (savedHistory) setHistory(savedHistory)
    if (savedWrong) setWrongAnswers(savedWrong)
    if (savedAnswered) setAnsweredQuestions(savedAnswered)
    if (savedCategoryProgress) setCategoryProgress(savedCategoryProgress)
  }, [])

  // 結果を保存
  const saveResult = (category, correctCount, totalCount, wrongIds) => {
    // 統計更新
    const newStats = {
      totalQuizzes: stats.totalQuizzes + 1,
      totalCorrect: stats.totalCorrect + correctCount,
      totalQuestions: stats.totalQuestions + totalCount
    }
    setStats(newStats)
    storage.set(STORAGE_KEYS.STATS, newStats)

    // 履歴追加
    const newHistory = [
      {
        date: new Date().toISOString(),
        category: category,
        score: correctCount,
        total: totalCount,
        percentage: Math.round((correctCount / totalCount) * 100)
      },
      ...history.slice(0, 19) // 最新20件まで保存
    ]
    setHistory(newHistory)
    storage.set(STORAGE_KEYS.HISTORY, newHistory)

    // 間違えた問題を保存
    const updatedWrong = [...new Set([...wrongAnswers, ...wrongIds])]
    setWrongAnswers(updatedWrong)
    storage.set(STORAGE_KEYS.WRONG_ANSWERS, updatedWrong)

    // 回答済み問題を保存
    const answeredIds = answers.map(a => a.questionId)
    const updatedAnswered = [...new Set([...answeredQuestions, ...answeredIds])]
    setAnsweredQuestions(updatedAnswered)
    storage.set(STORAGE_KEYS.ANSWERED, updatedAnswered)
  }

  // 間違えた問題から削除（正解したら）
  const removeFromWrong = (questionId) => {
    const updated = wrongAnswers.filter(id => id !== questionId)
    setWrongAnswers(updated)
    storage.set(STORAGE_KEYS.WRONG_ANSWERS, updated)
  }

  if (!data) {
    return <div className="loading">読み込み中...</div>
  }

  // カテゴリー選択（全問題）
  const selectCategory = (category) => {
    const savedIndex = categoryProgress[category.name] || 0
    const questions = data.questions.filter(q => q.category === category.name)

    // 進捗があり、有効な位置なら選択モーダルを表示
    if (savedIndex > 0 && savedIndex < questions.length) {
      setPendingCategory(category)
      setShowContinueModal(true)
      return
    }

    // 進捗がない場合は最初から開始
    startCategoryQuiz(category, 0)
  }

  // カテゴリークイズを開始（指定位置から）
  const startCategoryQuiz = (category, startIndex) => {
    const questions = data.questions.filter(q => q.category === category.name)
    setQuizQuestions(questions)
    setSelectedCategory(category)
    setCurrentQuestionIndex(startIndex)
    setScore(0)
    setAnswers([])
    setSelectedAnswers([])
    setShowExplanation(false)
    setShowContinueModal(false)
    setPendingCategory(null)
    setScreen('quiz')
  }

  // 続きから開始
  const continueFromProgress = () => {
    if (!pendingCategory) return
    const savedIndex = categoryProgress[pendingCategory.name] || 0
    startCategoryQuiz(pendingCategory, savedIndex)
  }

  // 最初から開始
  const startFromBeginning = () => {
    if (!pendingCategory) return
    // 進捗をクリア
    clearCategoryProgress(pendingCategory.name)
    startCategoryQuiz(pendingCategory, 0)
  }

  // カテゴリー選択（未回答のみ）
  const selectCategoryUnanswered = (category) => {
    const questions = data.questions.filter(q =>
      q.category === category.name && !answeredQuestions.includes(q.id)
    )
    if (questions.length === 0) {
      alert('このカテゴリーは全問回答済みです！')
      return
    }
    setQuizQuestions(questions.sort(() => Math.random() - 0.5))
    setSelectedCategory({ name: `${category.name}（未回答）` })
    setCurrentQuestionIndex(0)
    setScore(0)
    setAnswers([])
    setSelectedAnswers([])
    setShowExplanation(false)
    setScreen('quiz')
  }

  // カテゴリーの未回答数を取得
  const getUnansweredCount = (categoryName) => {
    return data.questions.filter(q =>
      q.category === categoryName && !answeredQuestions.includes(q.id)
    ).length
  }

  // カテゴリーの間違えた問題数を取得
  const getWrongCount = (categoryName) => {
    return data.questions.filter(q =>
      q.category === categoryName && wrongAnswers.includes(q.id)
    ).length
  }

  // カテゴリー別の間違えた問題に挑戦
  const startCategoryWrongQuestions = (category) => {
    const wrongQuestions = data.questions.filter(q =>
      q.category === category.name && wrongAnswers.includes(q.id)
    )
    if (wrongQuestions.length === 0) {
      alert('このカテゴリーで間違えた問題はありません！')
      return
    }
    setQuizQuestions(wrongQuestions.sort(() => Math.random() - 0.5))
    setSelectedCategory({ name: `${category.name}（復習）` })
    setCurrentQuestionIndex(0)
    setScore(0)
    setAnswers([])
    setSelectedAnswers([])
    setShowExplanation(false)
    setScreen('quiz')
  }

  // 全問チャレンジ
  const startAllQuestions = () => {
    setQuizQuestions([...data.questions].sort(() => Math.random() - 0.5))
    setSelectedCategory({ name: '全問チャレンジ' })
    setCurrentQuestionIndex(0)
    setScore(0)
    setAnswers([])
    setSelectedAnswers([])
    setShowExplanation(false)
    setScreen('quiz')
  }

  // 未回答問題のみチャレンジ
  const startUnansweredQuestions = () => {
    const unanswered = data.questions.filter(q => !answeredQuestions.includes(q.id))
    if (unanswered.length === 0) {
      alert('全ての問題に回答済みです！')
      return
    }
    setQuizQuestions(unanswered.sort(() => Math.random() - 0.5))
    setSelectedCategory({ name: '未回答問題' })
    setCurrentQuestionIndex(0)
    setScore(0)
    setAnswers([])
    setSelectedAnswers([])
    setShowExplanation(false)
    setScreen('quiz')
  }

  // 間違えた問題に挑戦
  const startWrongQuestions = () => {
    const wrongQuestions = data.questions.filter(q => wrongAnswers.includes(q.id))
    if (wrongQuestions.length === 0) {
      alert('間違えた問題はありません！')
      return
    }
    setQuizQuestions(wrongQuestions.sort(() => Math.random() - 0.5))
    setSelectedCategory({ name: '間違えた問題' })
    setCurrentQuestionIndex(0)
    setScore(0)
    setAnswers([])
    setSelectedAnswers([])
    setShowExplanation(false)
    setScreen('quiz')
  }

  // 問題が複数選択かどうか判定
  const isMultipleChoice = (question) => Array.isArray(question.answer)

  // 必要な選択数を取得
  const getRequiredCount = (question) => {
    if (Array.isArray(question.answer)) {
      return question.answer.length
    }
    return 1
  }

  // 回答を選択
  const handleAnswer = (index) => {
    if (showExplanation) return  // 確定後は選択不可

    const currentQuestion = quizQuestions[currentQuestionIndex]

    if (isMultipleChoice(currentQuestion)) {
      // 複数選択モード
      const requiredCount = getRequiredCount(currentQuestion)
      if (selectedAnswers.includes(index)) {
        // 選択解除
        setSelectedAnswers(selectedAnswers.filter(i => i !== index))
      } else if (selectedAnswers.length < requiredCount) {
        // 新しく選択
        setSelectedAnswers([...selectedAnswers, index])
      }
    } else {
      // 単一選択モード（即座に確定）
      setSelectedAnswers([index])
      confirmAnswer([index], currentQuestion)
    }
  }

  // 回答を確定（複数選択用）
  const confirmAnswer = (selected = selectedAnswers, question = quizQuestions[currentQuestionIndex]) => {
    setShowExplanation(true)

    let isCorrect
    if (isMultipleChoice(question)) {
      // 複数選択：全て一致しているかチェック
      const correctSet = new Set(question.answer)
      const selectedSet = new Set(selected)
      isCorrect = correctSet.size === selectedSet.size &&
        [...correctSet].every(v => selectedSet.has(v))
    } else {
      // 単一選択
      isCorrect = selected[0] === question.answer
    }

    if (isCorrect) {
      setScore(score + 1)
      if (wrongAnswers.includes(question.id)) {
        removeFromWrong(question.id)
      }
    }

    setAnswers([...answers, {
      questionId: question.id,
      selected: selected,
      correct: question.answer,
      isCorrect
    }])
  }

  // 次の問題へ
  const nextQuestion = () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setSelectedAnswers([])
      setShowExplanation(false)
    } else {
      // 結果を保存
      const wrongIds = answers.filter(a => !a.isCorrect).map(a => a.questionId)
      saveResult(selectedCategory.name, score, quizQuestions.length, wrongIds)
      // カテゴリー進捗をクリア（完了したので）
      const categoryName = selectedCategory.name.replace(/（.*）$/, '')
      clearCategoryProgress(categoryName)
      setScreen('result')
    }
  }

  // ホームに戻る（保存せず）
  const goHome = () => {
    setScreen('home')
    setSelectedCategory(null)
    setQuizQuestions([])
  }

  // 一時保存してホームに戻る
  const saveAndGoHome = () => {
    // カテゴリー名を取得（「（未回答）」などの接尾辞を除去）
    const categoryName = selectedCategory.name.replace(/（.*）$/, '')

    // 次の問題のインデックスを保存
    const newProgress = {
      ...categoryProgress,
      [categoryName]: currentQuestionIndex + 1
    }
    setCategoryProgress(newProgress)
    storage.set(STORAGE_KEYS.CATEGORY_PROGRESS, newProgress)

    // 回答済み問題を保存（一時保存でも回答済みとして記録）
    const answeredIds = answers.map(a => a.questionId)
    const updatedAnswered = [...new Set([...answeredQuestions, ...answeredIds])]
    setAnsweredQuestions(updatedAnswered)
    storage.set(STORAGE_KEYS.ANSWERED, updatedAnswered)

    // 間違えた問題も保存
    const wrongIds = answers.filter(a => !a.isCorrect).map(a => a.questionId)
    const updatedWrong = [...new Set([...wrongAnswers, ...wrongIds])]
    setWrongAnswers(updatedWrong)
    storage.set(STORAGE_KEYS.WRONG_ANSWERS, updatedWrong)

    setScreen('home')
    setSelectedCategory(null)
    setQuizQuestions([])
  }

  // カテゴリーの進捗をクリア
  const clearCategoryProgress = (categoryName) => {
    const newProgress = { ...categoryProgress }
    delete newProgress[categoryName]
    setCategoryProgress(newProgress)
    storage.set(STORAGE_KEYS.CATEGORY_PROGRESS, newProgress)
  }

  // データリセット
  const resetData = () => {
    if (confirm('学習履歴をすべて削除しますか？')) {
      localStorage.removeItem(STORAGE_KEYS.HISTORY)
      localStorage.removeItem(STORAGE_KEYS.WRONG_ANSWERS)
      localStorage.removeItem(STORAGE_KEYS.STATS)
      localStorage.removeItem(STORAGE_KEYS.ANSWERED)
      localStorage.removeItem(STORAGE_KEYS.CATEGORY_PROGRESS)
      setStats({ totalQuizzes: 0, totalCorrect: 0, totalQuestions: 0 })
      setHistory([])
      setWrongAnswers([])
      setAnsweredQuestions([])
      setCategoryProgress({})
    }
  }

  // ホーム画面
  if (screen === 'home') {
    const overallPercentage = stats.totalQuestions > 0
      ? Math.round((stats.totalCorrect / stats.totalQuestions) * 100)
      : 0

    // 問題更新時に古いIDが残っても壊れないようフィルタリング
    const validQuestionIds = new Set(data.questions.map(q => q.id))
    const validAnsweredCount = answeredQuestions.filter(id => validQuestionIds.has(id)).length
    const validWrongCount = wrongAnswers.filter(id => validQuestionIds.has(id)).length
    const progressPercent = data.questions.length > 0
      ? Math.round((validAnsweredCount / data.questions.length) * 100)
      : 0

    return (
      <div className="app">
        <header className="header">
          <img src="/hero.png" alt="看護師国家試験対策 - かず学長の挑戦状" className="hero-image" />
          <p className="app-name">Nurse Path+</p>
          <button className="help-btn-main" onClick={() => setShowHelp(true)}>
            <FaQuestionCircle /> 使い方
          </button>
        </header>

        {/* ヘルプモーダル */}
        {showHelp && (
          <div className="modal-overlay" onClick={() => setShowHelp(false)}>
            <div className="modal-content help-modal" onClick={e => e.stopPropagation()}>
              <h2><FaQuestionCircle /> 使い方</h2>
              <div className="help-content">
                <div className="help-item">
                  <h3>カテゴリー別クイズ</h3>
                  <p>カテゴリーを選んで問題に挑戦。進捗は自動保存されます。</p>
                </div>
                <div className="help-item">
                  <h3>未回答のみ</h3>
                  <p>まだ解いていない問題だけをピックアップして出題します。</p>
                </div>
                <div className="help-item">
                  <h3>復習（赤ボタン）</h3>
                  <p>間違えた問題だけを復習できます。正解すると復習リストから消えます。</p>
                </div>
                <div className="help-item">
                  <h3>一時保存</h3>
                  <p>解説画面で「一時保存」を押すと、次回は続きから再開できます。</p>
                </div>
                <div className="help-item">
                  <h3>複数選択問題</h3>
                  <p>「2つ選べ」などの問題は、必要な数を選んでから「回答を確定」を押してください。</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setShowHelp(false)}>
                閉じる
              </button>
            </div>
          </div>
        )}

        {/* 続きから/最初からモーダル */}
        {showContinueModal && pendingCategory && (
          <div className="modal-overlay" onClick={() => setShowContinueModal(false)}>
            <div className="modal-content continue-modal" onClick={e => e.stopPropagation()}>
              <h2>{pendingCategory.name}</h2>
              <p className="continue-info">
                前回の続き（{categoryProgress[pendingCategory.name] + 1}問目〜）がありますs
              </p>
              <div className="continue-buttons">
                <button className="continue-btn" onClick={continueFromProgress}>
                  <FaPlayCircle /> 続きから
                </button>
                <button className="restart-btn" onClick={startFromBeginning}>
                  <FaRedo /> 最初から
                </button>
              </div>
              <button className="modal-cancel-btn" onClick={() => setShowContinueModal(false)}>
                キャンセル
              </button>
            </div>
          </div>
        )}

        <main className="main">
          {/* ダッシュボード */}
          <div className="stats-card">
            <h3><FaChartLine className="section-icon" /> 学習ダッシュボード</h3>
            <div className="dashboard-progress">
              <div className="dashboard-progress-header">
                <span className="dashboard-progress-label">回答済み</span>
                <span className="dashboard-progress-value">{validAnsweredCount} / {data.questions.length}問</span>
              </div>
              <div className="dashboard-progress-bar">
                <div
                  className="dashboard-progress-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="dashboard-progress-percent">{progressPercent}%</div>
            </div>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-icon trophy"><FaTrophy /></div>
                <span className="stat-number">{overallPercentage}%</span>
                <span className="stat-label">正解率</span>
              </div>
              <div className="stat-item">
                <div className="stat-icon fire"><FaFire /></div>
                <span className="stat-number">{stats.totalQuizzes}</span>
                <span className="stat-label">回挑戦</span>
              </div>
              <div className="stat-item">
                <div className="stat-icon star"><FaStar /></div>
                <span className="stat-number">{validWrongCount}</span>
                <span className="stat-label">要復習</span>
              </div>
            </div>
          </div>

          <div className="challenge-buttons">
            <button className="all-challenge-btn" onClick={startAllQuestions}>
              <MdPlayArrow className="btn-icon" />
              全問チャレンジ ({data.questions.length}問)
            </button>

            {data.questions.length - answeredQuestions.length > 0 && (
              <button className="unanswered-challenge-btn" onClick={startUnansweredQuestions}>
                <FaQuestionCircle className="btn-icon" />
                未回答のみ ({data.questions.length - answeredQuestions.length}問)
              </button>
            )}

            {wrongAnswers.length > 0 && (
              <button className="wrong-challenge-btn" onClick={startWrongQuestions}>
                <FaRedo className="btn-icon" />
                間違えた問題 ({wrongAnswers.length}問)
              </button>
            )}
          </div>

          <h2><MdQuiz className="section-icon" /> カテゴリーを選択</h2>
          <div className="category-grid">
            {data.categories.map(category => {
              const IconComponent = getCategoryIcon(category.name)
              const unansweredCount = getUnansweredCount(category.name)
              const wrongCount = getWrongCount(category.name)
              const allAnswered = unansweredCount === 0
              const savedIndex = categoryProgress[category.name] || 0
              const hasProgress = savedIndex > 0
              return (
                <div key={category.id} className="category-card">
                  <button
                    className="category-btn"
                    onClick={() => selectCategory(category)}
                  >
                    <div className="category-icon">
                      <IconComponent />
                    </div>
                    <span className={`category-name${getDisplayName(category.name).length > 7 ? ' category-name-sm' : ''}`}>{getDisplayName(category.name)}</span>
                    <span className="category-count">{category.questionCount}問</span>
                    {hasProgress && (
                      <span className="category-progress-badge">
                        <FaPlayCircle /> {savedIndex + 1}問目から
                      </span>
                    )}
                  </button>
                  <div className="category-sub-buttons">
                    {!allAnswered ? (
                      <button
                        className="unanswered-btn"
                        onClick={() => selectCategoryUnanswered(category)}
                      >
                        <FaQuestionCircle /> 未回答 {unansweredCount}問
                      </button>
                    ) : (
                      <div className="all-answered">
                        <FaCheckCircle /> 全問回答済
                      </div>
                    )}
                    {wrongCount > 0 && (
                      <button
                        className="wrong-btn"
                        onClick={() => startCategoryWrongQuestions(category)}
                      >
                        <FaRedo /> 復習 {wrongCount}問
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* 履歴・リセットボタン */}
          {stats.totalQuizzes > 0 && (
            <div className="history-actions">
              <button className="history-btn" onClick={() => setScreen('history')}>
                <FaHistory className="btn-icon-small" /> 学習履歴を見る
              </button>
              <button className="reset-btn" onClick={resetData}>
                <FaTrash className="btn-icon-small" /> データをリセット
              </button>
            </div>
          )}
        </main>

        <footer className="footer">
          <p>最終更新: {new Date(data.lastUpdated).toLocaleDateString('ja-JP')}</p>
        </footer>
      </div>
    )
  }

  // 履歴画面
  if (screen === 'history') {
    return (
      <div className="app">
        <header className="quiz-header">
          <button className="back-btn" onClick={goHome}><FaArrowLeft /> 戻る</button>
          <h2 style={{ flex: 1, textAlign: 'center', margin: 0 }}><FaHistory className="section-icon" /> 学習履歴</h2>
          <div style={{ width: '60px' }}></div>
        </header>

        <main className="history-main">
          {history.length === 0 ? (
            <p className="no-history">まだ学習履歴がありません</p>
          ) : (
            <div className="history-list">
              {history.map((item, index) => (
                <div key={index} className="history-item">
                  <div className="history-date">
                    {new Date(item.date).toLocaleDateString('ja-JP', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  <div className="history-category">{item.category}</div>
                  <div className="history-score">
                    <span className={item.percentage >= 80 ? 'good' : item.percentage >= 60 ? 'ok' : 'bad'}>
                      {item.score}/{item.total} ({item.percentage}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    )
  }

  // クイズ画面
  if (screen === 'quiz') {
    const question = quizQuestions[currentQuestionIndex]
    const isMulti = isMultipleChoice(question)
    const requiredCount = getRequiredCount(question)
    const correctAnswers = isMulti ? question.answer : [question.answer]

    // 解説をメモカード形式でレンダリング
    const renderExplanation = (text) => {
      if (!text) return null
      // 番号付き → 形式かどうか判定
      const hasArrow = /^\d+[．.]\s*.+→/m.test(text)
      if (hasArrow) {
        const items = text.split('\n').filter(l => l.trim()).map((line, i) => {
          // ○/× あり
          const matchMark = line.match(/^(\d+)[．.]\s*(.*?)\s*→\s*([○×])\s*(.*)$/)
          if (matchMark) {
            const [, num, choice, mark, reason] = matchMark
            const isCorrect = mark === '○'
            return (
              <div key={i} className={`memo-item ${isCorrect ? 'memo-correct' : 'memo-wrong'}`}>
                <span className="memo-num">{num}</span>
                <span className="memo-choice">{choice.trim()}</span>
                <span className="memo-arrow">→</span>
                <span className="memo-mark">{mark}</span>
                <span className="memo-reason">{reason}</span>
              </div>
            )
          }
          // ○/× なし（→ 理由のみ）
          const matchArrow = line.match(/^(\d+)[．.]\s*(.*?)\s*→\s*(.+)$/)
          if (matchArrow) {
            const [, num, choice, reason] = matchArrow
            return (
              <div key={i} className="memo-item memo-neutral">
                <span className="memo-num">{num}</span>
                <span className="memo-choice">{choice.trim()}</span>
                <span className="memo-arrow">→</span>
                <span className="memo-reason">{reason}</span>
              </div>
            )
          }
          return <div key={i} className="memo-note">{line}</div>
        })
        return <div className="explanation-memo">{items}</div>
      }
      // それ以外は全文をそのまま表示
      return <div className="memo-note">{text}</div>
    }

    // 正誤判定
    const checkIsCorrect = () => {
      if (isMulti) {
        const correctSet = new Set(question.answer)
        const selectedSet = new Set(selectedAnswers)
        return correctSet.size === selectedSet.size &&
          [...correctSet].every(v => selectedSet.has(v))
      }
      return selectedAnswers[0] === question.answer
    }

    return (
      <div className="app">
        <header className="quiz-header">
          <button className="back-btn" onClick={goHome}><FaArrowLeft /> 戻る</button>
          <div className="progress">
            <span>{currentQuestionIndex + 1} / {quizQuestions.length}</span>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }}
              />
            </div>
          </div>
          <div className="score-display">
            正解: {score}問
          </div>
        </header>

        <main className="quiz-main">
          <div className="category-tag">{question.category}</div>

          <div className="question-card">
            <p className="question-text">{question.question}</p>
            {isMulti && !showExplanation && (
              <p className="multi-select-hint">
                {requiredCount}つ選んでください（{selectedAnswers.length}/{requiredCount}）
              </p>
            )}
          </div>

          <div className="choices">
            {question.choices.map((choice, index) => {
              let className = 'choice-btn'

              if (showExplanation) {
                // 解説表示時：正解と不正解を表示
                if (correctAnswers.includes(index)) {
                  className += ' correct'
                } else if (selectedAnswers.includes(index)) {
                  className += ' incorrect'
                }
              } else if (selectedAnswers.includes(index)) {
                // 選択中
                className += ' selected'
              }

              return (
                <button
                  key={index}
                  className={className}
                  onClick={() => handleAnswer(index)}
                  disabled={showExplanation}
                >
                  <span className="choice-number">{index + 1}</span>
                  <span className="choice-text">{choice}</span>
                </button>
              )
            })}
          </div>

          {/* 複数選択時の確定ボタン */}
          {isMulti && !showExplanation && selectedAnswers.length === requiredCount && (
            <button className="confirm-btn" onClick={() => confirmAnswer()}>
              <FaCheckCircle /> 回答を確定
            </button>
          )}

          {showExplanation && (
            <div className="explanation">
              <h3 className={checkIsCorrect() ? 'correct-title' : 'incorrect-title'}>
                {checkIsCorrect() ? <><FaCheckCircle /> 正解！</> : <><FaTimesCircle /> 不正解</>}
              </h3>
              <div className="correct-answer-box">
                <span className="correct-answer-label">正解</span>
                {correctAnswers.map((ans, i) => (
                  <span key={i} className="correct-answer-item">
                    <span className="correct-answer-number">{ans + 1}</span>
                    <span className="correct-answer-text">{question.choices[ans]}</span>
                  </span>
                ))}
              </div>
              {renderExplanation(question.explanation)}
              <div className="explanation-actions">
                <button className="next-btn" onClick={nextQuestion}>
                  {currentQuestionIndex < quizQuestions.length - 1 ? <>次の問題へ <FaArrowRight /></> : <>結果を見る <FaTrophy /></>}
                </button>
                {currentQuestionIndex < quizQuestions.length - 1 && (
                  <button className="save-btn" onClick={saveAndGoHome}>
                    <FaSave /> 一時保存
                  </button>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    )
  }

  // 結果画面
  if (screen === 'result') {
    const percentage = Math.round((score / quizQuestions.length) * 100)

    let message = ''
    let emoji = ''
    if (percentage === 100) {
      message = '完璧！素晴らしい！'
      emoji = '🎉'
    } else if (percentage >= 80) {
      message = '優秀です！'
      emoji = '😊'
    } else if (percentage >= 60) {
      message = 'もう少しで合格ライン！'
      emoji = '💪'
    } else {
      message = '復習しましょう！'
      emoji = '📚'
    }

    return (
      <div className="app">
        <main className="result-main">
          <h1 className="result-emoji">{emoji}</h1>
          <h2>結果発表</h2>

          <div className="result-card">
            <div className="result-score">
              <span className="score-number">{score}</span>
              <span className="score-total">/ {quizQuestions.length}</span>
            </div>
            <div className="result-percentage">{percentage}%</div>
            <p className="result-message">{message}</p>
          </div>

          <div className="result-details">
            <h3>解答一覧</h3>
            {answers.map((answer, index) => (
              <div key={index} className={`answer-item ${answer.isCorrect ? 'correct' : 'incorrect'}`}>
                <span className="answer-number">問{index + 1}</span>
                <span className="answer-status">{answer.isCorrect ? '⭕' : '❌'}</span>
              </div>
            ))}
          </div>

          <p className="save-notice">結果は自動保存されました</p>

          <div className="result-actions">
            <button className="retry-btn" onClick={() => {
              setCurrentQuestionIndex(0)
              setScore(0)
              setAnswers([])
              setSelectedAnswers([])
              setShowExplanation(false)
              setScreen('quiz')
            }}>
              <FaRedo className="btn-icon" /> もう一度挑戦
            </button>
            <button className="home-btn" onClick={goHome}>
              <FaHome className="btn-icon" /> ホームに戻る
            </button>
          </div>
        </main>
      </div>
    )
  }

  return null
}

export default App
