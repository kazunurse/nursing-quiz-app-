import { useState, useEffect } from 'react'
import './App.css'

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

function App() {
  const [data, setData] = useState(null)
  const [screen, setScreen] = useState('home') // home, category, quiz, result
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [score, setScore] = useState(0)
  const [answers, setAnswers] = useState([])
  const [quizQuestions, setQuizQuestions] = useState([])

  // データを読み込み
  useEffect(() => {
    // 本番では questions.json から読み込む
    import('./data/questions.json')
      .then(module => setData(module.default))
      .catch(() => setData(sampleData))
  }, [])

  if (!data) {
    return <div className="loading">読み込み中...</div>
  }

  // カテゴリー選択
  const selectCategory = (category) => {
    const questions = data.questions.filter(q => q.category === category.name)
    setQuizQuestions(questions)
    setSelectedCategory(category)
    setCurrentQuestionIndex(0)
    setScore(0)
    setAnswers([])
    setSelectedAnswer(null)
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
    setSelectedAnswer(null)
    setShowExplanation(false)
    setScreen('quiz')
  }

  // 回答を選択
  const handleAnswer = (index) => {
    if (selectedAnswer !== null) return

    setSelectedAnswer(index)
    setShowExplanation(true)

    const isCorrect = index === quizQuestions[currentQuestionIndex].answer
    if (isCorrect) {
      setScore(score + 1)
    }

    setAnswers([...answers, {
      questionId: quizQuestions[currentQuestionIndex].id,
      selected: index,
      correct: quizQuestions[currentQuestionIndex].answer,
      isCorrect
    }])
  }

  // 次の問題へ
  const nextQuestion = () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setSelectedAnswer(null)
      setShowExplanation(false)
    } else {
      setScreen('result')
    }
  }

  // ホームに戻る
  const goHome = () => {
    setScreen('home')
    setSelectedCategory(null)
    setQuizQuestions([])
  }

  // ホーム画面
  if (screen === 'home') {
    return (
      <div className="app">
        <header className="header">
          <img src="/hero.png" alt="看護師国家試験対策" className="hero-image" />
          <h1>看護師国家試験アプリ</h1>
          <p className="subtitle">かずからの挑戦状</p>
        </header>

        <main className="main">
          <button className="all-challenge-btn" onClick={startAllQuestions}>
            全問チャレンジ ({data.questions.length}問)
          </button>

          <h2>カテゴリーを選択</h2>
          <div className="category-grid">
            {data.categories.map(category => (
              <button
                key={category.id}
                className="category-btn"
                onClick={() => selectCategory(category)}
              >
                <span className="category-name">{category.name}</span>
                <span className="category-count">{category.questionCount}問</span>
              </button>
            ))}
          </div>
        </main>

        <footer className="footer">
          <p>最終更新: {new Date(data.lastUpdated).toLocaleDateString('ja-JP')}</p>
        </footer>
      </div>
    )
  }

  // クイズ画面
  if (screen === 'quiz') {
    const question = quizQuestions[currentQuestionIndex]

    return (
      <div className="app">
        <header className="quiz-header">
          <button className="back-btn" onClick={goHome}>← 戻る</button>
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
          </div>

          <div className="choices">
            {question.choices.map((choice, index) => {
              let className = 'choice-btn'
              if (selectedAnswer !== null) {
                if (index === question.answer) {
                  className += ' correct'
                } else if (index === selectedAnswer) {
                  className += ' incorrect'
                }
              }

              return (
                <button
                  key={index}
                  className={className}
                  onClick={() => handleAnswer(index)}
                  disabled={selectedAnswer !== null}
                >
                  <span className="choice-number">{index + 1}</span>
                  <span className="choice-text">{choice}</span>
                </button>
              )
            })}
          </div>

          {showExplanation && (
            <div className="explanation">
              <h3>{selectedAnswer === question.answer ? '⭕ 正解！' : '❌ 不正解'}</h3>
              <p>{question.explanation}</p>
              <button className="next-btn" onClick={nextQuestion}>
                {currentQuestionIndex < quizQuestions.length - 1 ? '次の問題へ →' : '結果を見る'}
              </button>
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

          <div className="result-actions">
            <button className="retry-btn" onClick={() => {
              setCurrentQuestionIndex(0)
              setScore(0)
              setAnswers([])
              setSelectedAnswer(null)
              setShowExplanation(false)
              setScreen('quiz')
            }}>
              もう一度挑戦
            </button>
            <button className="home-btn" onClick={goHome}>
              ホームに戻る
            </button>
          </div>
        </main>
      </div>
    )
  }

  return null
}

export default App
