export default function TelegramInitializer() {
  return (
    <div className="card">
      <h2>⚠️ Telegram Required</h2>
      <p style={{ marginTop: '20px', lineHeight: '1.6', color: '#6b7280' }}>
        This mini app only works inside Telegram.
      </p>
      <ol style={{ marginTop: '20px', paddingLeft: '20px', color: '#6b7280' }}>
        <li>Open Telegram</li>
        <li>Search for a bot that has this app integrated</li>
        <li>Tap to play!</li>
      </ol>
    </div>
  )
}
