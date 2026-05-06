import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './LoginPage.css'

const BRAND_LINKS = {
  SNIPERFACTORY: 'https://edu-support-seven.vercel.app/login?brand=SNIPERFACTORY',
  INSIDEOUT: 'https://edu-support-seven.vercel.app/login?brand=INSIDEOUT',
}

function detectBrand() {
  const params = new URLSearchParams(window.location.search)
  const brandParam = params.get('brand')
  if (brandParam === 'SNIPERFACTORY' || brandParam === 'INSIDEOUT') return brandParam
  const host = window.location.hostname
  if (host.includes('insideout')) return 'INSIDEOUT'
  if (host.includes('sniperfactory')) return 'SNIPERFACTORY'
  return null
}

function EyeIcon({ off = false }) {
  if (off) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3l18 18" />
        <path d="M10.6 10.6A3 3 0 0 0 13.4 13.4" />
        <path d="M9.9 4.2A10.6 10.6 0 0 1 12 4c7 0 11 8 11 8a20.2 20.2 0 0 1-5 5.9" />
        <path d="M6.6 6.6A20.7 20.7 0 0 0 1 12s4 8 11 8a10.7 10.7 0 0 0 4-.8" />
      </svg>
    )
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function BrandLogo() {
  return (
    <svg width="135" height="18" viewBox="0 0 135 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g clipPath="url(#brand-logo-clip0)">
        <path d="M134.995 4.17385L130.769 13.2751L130.206 14.5126C129.867 15.2551 129.36 15.8401 128.673 16.2788C127.997 16.7176 127.241 16.9313 126.407 16.9313H125.438L125.99 14.7488H126.52C126.87 14.7488 127.196 14.6476 127.501 14.4563C127.805 14.2651 128.03 14.0063 128.177 13.6688L128.357 13.2638L124.131 4.1626H126.543L129.574 10.6763L132.606 4.1626H135.018L134.995 4.17385Z" fill="black"/>
        <path d="M120.603 4.86006C120.941 4.57881 121.324 4.35381 121.753 4.17381C122.192 3.99381 122.688 3.90381 123.229 3.90381V6.08631C122.496 6.08631 121.876 6.34506 121.369 6.85131C120.862 7.38006 120.603 7.99881 120.603 8.70756V13.2751H118.417V4.15131H120.603V4.86006Z" fill="black"/>
        <path d="M111.962 6.09729C111.23 6.09729 110.61 6.35604 110.103 6.86229C109.596 7.36854 109.336 7.98729 109.336 8.71854C109.336 9.44979 109.596 10.046 110.103 10.5523C110.351 10.811 110.621 11.0023 110.937 11.1373C111.264 11.261 111.602 11.3173 111.962 11.3173C112.323 11.3173 112.65 11.261 112.965 11.1373C113.281 11.0023 113.563 10.811 113.822 10.5523C114.329 10.046 114.588 9.42729 114.588 8.71854C114.588 8.00979 114.329 7.36854 113.822 6.86229C113.292 6.35604 112.672 6.09729 111.962 6.09729ZM111.962 3.91479C112.627 3.91479 113.258 4.03854 113.844 4.29729C114.431 4.54479 114.938 4.88229 115.377 5.32104C115.817 5.75979 116.155 6.26604 116.403 6.85104C116.662 7.43604 116.786 8.05479 116.786 8.72979C116.786 9.40479 116.662 10.001 116.403 10.586C116.155 11.171 115.817 11.6773 115.377 12.116C114.938 12.5548 114.431 12.9035 113.844 13.151C113.258 13.3985 112.639 13.511 111.962 13.511C111.286 13.511 110.666 13.3873 110.08 13.151C109.494 12.8923 108.987 12.5548 108.547 12.116C108.108 11.6773 107.758 11.171 107.511 10.586C107.263 10.001 107.15 9.38229 107.15 8.72979C107.15 8.07729 107.274 7.43604 107.511 6.85104C107.77 6.26604 108.108 5.75979 108.547 5.32104C108.987 4.88229 109.494 4.54479 110.08 4.29729C110.666 4.03854 111.286 3.91479 111.962 3.91479Z" fill="black"/>
        <path d="M106.044 13.2632H104.037C103.62 13.2632 103.237 13.1845 102.865 13.027C102.505 12.8695 102.189 12.6557 101.919 12.3857C101.648 12.1045 101.434 11.7895 101.276 11.4182C101.118 11.0582 101.04 10.6645 101.04 10.2482V2.32823L103.226 1.77698V5.25323H104.5L105.052 7.43573H103.226V10.2595C103.226 10.4845 103.305 10.687 103.463 10.8445C103.62 11.002 103.812 11.0807 104.026 11.0807H105.48L106.032 13.2632H106.044Z" fill="black"/>
        <path d="M99.4158 12.1051C98.9762 12.5438 98.4691 12.8926 97.883 13.1401C97.297 13.3876 96.6771 13.5001 96.0009 13.5001C95.3247 13.5001 94.7048 13.3763 94.1187 13.1401C93.5327 12.8813 93.0255 12.5438 92.586 12.1051C92.1464 11.6663 91.7971 11.1601 91.5491 10.5751C91.3012 9.99006 91.1885 9.37131 91.1885 8.71881C91.1885 8.06631 91.3124 7.42506 91.5491 6.84006C91.8083 6.25506 92.1464 5.74881 92.586 5.31006C93.0255 4.87131 93.5327 4.53381 94.1187 4.28631C94.7048 4.02756 95.3247 3.90381 96.0009 3.90381C96.6771 3.90381 97.297 4.02756 97.883 4.28631C98.4691 4.53381 98.9762 4.87131 99.4158 5.31006L97.8605 6.86256C97.3533 6.35631 96.7334 6.09756 96.0009 6.09756C95.2683 6.09756 94.671 6.35631 94.1413 6.86256C93.6341 7.36881 93.3749 7.98756 93.3749 8.71881C93.3749 9.45006 93.6341 10.0463 94.1413 10.5526C94.4005 10.8113 94.6823 11.0026 94.9978 11.1376C95.3134 11.2613 95.6515 11.3176 96.0009 11.3176C96.7447 11.3176 97.3646 11.0588 97.8605 10.5526L99.4158 12.1051Z" fill="black"/>
        <path d="M89.5384 4.15117V13.2749H87.352V8.72992C87.352 7.99867 87.0927 7.37992 86.5856 6.87367C86.0784 6.36742 85.4585 6.10867 84.726 6.10867C84.3766 6.10867 84.0385 6.17617 83.7004 6.31117C83.3848 6.44617 83.1031 6.63742 82.8664 6.87367C82.3592 7.37992 82.1 7.99867 82.1 8.72992C82.1 9.46117 82.3592 10.0574 82.8664 10.5637C83.1143 10.8224 83.3848 11.0137 83.7004 11.1487C84.0272 11.2724 84.3653 11.3287 84.726 11.3287C85.0866 11.3287 85.4135 11.2724 85.7065 11.1487L86.4954 13.0949C85.9319 13.3762 85.2895 13.5112 84.5456 13.5112C83.8807 13.5112 83.2608 13.3874 82.6861 13.1512C82.1225 12.8924 81.6379 12.5549 81.2322 12.1162C80.8152 11.6774 80.4996 11.1712 80.2629 10.5862C80.0375 10.0012 79.9136 9.38242 79.9136 8.72992C79.9136 8.07742 80.0263 7.43617 80.2629 6.85117C80.4884 6.26617 80.8152 5.75992 81.2322 5.32117C81.6492 4.88242 82.1338 4.54492 82.6861 4.29742C83.2608 4.03867 83.8807 3.91492 84.5456 3.91492C85.143 3.91492 85.6727 4.00492 86.1348 4.18492C86.5968 4.36492 87.0026 4.60117 87.352 4.87117V4.13992H89.5384V4.15117Z" fill="black"/>
        <path d="M78.6419 2.71096C78.3376 2.71096 78.0558 2.76721 77.7854 2.89096C77.5261 3.00346 77.3007 3.14971 77.0979 3.34096C76.9063 3.53221 76.7485 3.76846 76.6245 4.02721C76.5006 4.28596 76.4442 4.55596 76.4442 4.85971H77.7403L78.2925 7.04221H76.4555V13.2522H74.269V4.85971C74.2803 4.27471 74.393 3.72346 74.6184 3.20596C74.8326 2.67721 75.1481 2.19346 75.5651 1.78846C75.9821 1.37222 76.4555 1.05721 76.9852 0.843462C77.5149 0.629712 78.0784 0.517212 78.6645 0.517212V2.69972L78.6419 2.71096Z" fill="black"/>
        <path d="M70.1713 4.86006C70.5094 4.57881 70.8926 4.35381 71.3209 4.17381C71.7604 3.99381 72.2563 3.90381 72.7973 3.90381V6.08631C72.0647 6.08631 71.4448 6.34506 70.9377 6.85131C70.4305 7.38006 70.1713 7.99881 70.1713 8.70756V13.2751H67.9849V4.15131H70.1713V4.86006Z" fill="black"/>
        <path d="M63.9283 9.81006H59.1497C59.2737 10.0913 59.4427 10.3388 59.6794 10.5526C59.9386 10.8113 60.2204 11.0026 60.536 11.1376C60.8515 11.2613 61.1896 11.3176 61.539 11.3176C62.0349 11.3176 62.4857 11.2051 62.8689 10.9688L65.1455 11.8801C64.706 12.3863 64.1763 12.7913 63.5564 13.0838C62.9365 13.3651 62.2603 13.5001 61.5277 13.5001C60.8628 13.5001 60.2317 13.3763 59.6456 13.1401C59.0595 12.8813 58.5524 12.5438 58.1128 12.1051C57.6733 11.6663 57.3239 11.1601 57.076 10.5751C56.828 9.99006 56.7153 9.37131 56.7153 8.71881C56.7153 8.06631 56.8393 7.42506 57.076 6.84006C57.3352 6.25506 57.6733 5.74881 58.1128 5.31006C58.5524 4.87131 59.0595 4.53381 59.6456 4.28631C60.2317 4.02756 60.8515 3.90381 61.5277 3.90381C62.204 3.90381 62.8238 4.02756 63.4099 4.28631C63.9959 4.53381 64.5031 4.87131 64.9426 5.31006C65.3822 5.74881 65.7203 6.25506 65.9682 6.84006C66.2274 7.42506 66.3514 8.04381 66.3514 8.71881C66.3514 9.11256 66.3063 9.47256 66.2274 9.81006H63.9283ZM61.539 6.09756C60.829 6.09756 60.2091 6.35631 59.6794 6.86256C59.454 7.08756 59.2737 7.34631 59.1497 7.62756H63.9283C63.8043 7.34631 63.6353 7.09881 63.3986 6.86256C62.8914 6.35631 62.2716 6.09756 61.539 6.09756Z" fill="black"/>
        <path d="M50.9864 3.91479C51.6513 3.91479 52.2712 4.03854 52.8234 4.29729C53.3982 4.54479 53.8828 4.88229 54.2998 5.32104C54.7168 5.75979 55.0324 6.26604 55.2691 6.85104C55.4945 7.43604 55.6185 8.05479 55.6185 8.72979C55.6185 9.40479 55.5058 10.001 55.2691 10.586C55.0437 11.171 54.7168 11.6773 54.2998 12.116C53.8828 12.5548 53.3982 12.9035 52.8234 13.151C52.2599 13.3985 51.6513 13.511 50.9864 13.511C50.2425 13.511 49.5889 13.376 49.0366 13.0948L49.8255 11.1485C50.1186 11.2723 50.4454 11.3285 50.8061 11.3285C51.1667 11.3285 51.4935 11.2723 51.8091 11.1485C52.1247 11.0135 52.4064 10.8223 52.6656 10.5635C53.1728 10.0573 53.432 9.43854 53.432 8.72979C53.432 8.02104 53.1728 7.37979 52.6656 6.87354C52.1359 6.36729 51.5161 6.10854 50.8061 6.10854C50.096 6.10854 49.4536 6.36729 48.9465 6.87354C48.4393 7.37979 48.1801 7.99854 48.1801 8.72979V16.9198H45.9937V4.15104H48.1801V4.88229C48.5295 4.60104 48.9352 4.37604 49.3973 4.19604C49.8594 4.01604 50.3891 3.92604 50.9864 3.92604V3.91479Z" fill="black"/>
        <path d="M41.6108 13.2636V4.17356H43.7973V13.2748H41.6108V13.2636ZM41.6108 0.528564H43.7973V2.71106H41.6108V0.528564Z" fill="black"/>
        <path d="M35.6474 3.91492C36.2447 3.91492 36.7857 4.02742 37.2703 4.26367C37.755 4.47742 38.172 4.79242 38.5101 5.19742C38.8594 5.59117 39.1299 6.04117 39.3103 6.55867C39.5019 7.07617 39.6033 7.63867 39.6033 8.23492V13.2749H37.4169V8.23492C37.4169 7.62742 37.2027 7.12117 36.7744 6.72742C36.3574 6.31117 35.8616 6.10867 35.2755 6.10867C34.6894 6.10867 34.171 6.31117 33.7653 6.72742C33.3483 7.14367 33.1454 7.63867 33.1454 8.23492V13.2749H30.959V4.17367H33.1454V4.85992C33.4723 4.57867 33.8442 4.35367 34.2612 4.18492C34.6782 4.00492 35.1403 3.91492 35.6474 3.91492Z" fill="black"/>
        <path d="M26.0249 7.62734C26.1714 7.66109 26.4194 7.75109 26.7575 7.88609C27.0956 8.02109 27.4449 8.21234 27.7943 8.44859C28.155 8.67359 28.4705 8.96609 28.741 9.32609C29.0115 9.67484 29.1468 10.0911 29.1468 10.5861C29.1468 11.0136 29.0791 11.3961 28.9326 11.7561C28.7974 12.1048 28.5945 12.4198 28.3353 12.6898C28.0648 12.9598 27.738 13.1623 27.3548 13.3086C26.9603 13.4548 26.5321 13.5223 26.0474 13.5223C25.3036 13.5223 24.6161 13.3873 23.9737 13.1173C23.3426 12.8473 22.8354 12.5211 22.4409 12.1386L23.9512 10.6311C24.2667 11.0023 24.6048 11.2498 24.9542 11.3623C25.3149 11.4748 25.6192 11.5311 25.8671 11.5311C26.239 11.5311 26.5208 11.4636 26.7011 11.3173C26.8814 11.1711 26.9716 10.9911 26.9716 10.7886C26.9716 10.6423 26.9152 10.5186 26.7913 10.4061C26.6673 10.2936 26.5208 10.2036 26.3517 10.1361C26.1939 10.0686 26.0249 10.0123 25.8558 9.96734C25.6868 9.92234 25.5515 9.87734 25.4388 9.84359C25.2923 9.79859 25.0444 9.70859 24.695 9.58484C24.3569 9.46109 24.0075 9.29234 23.6356 9.05609C23.2862 8.83109 22.9706 8.53859 22.7002 8.17859C22.4297 7.82984 22.2944 7.40234 22.2944 6.90734C22.2944 6.41234 22.3846 5.96234 22.5536 5.60234C22.734 5.23109 22.9706 4.91609 23.2637 4.66859C23.5567 4.42109 23.8948 4.25234 24.2667 4.13984C24.6386 4.01609 25.0331 3.95984 25.4388 3.95984C26.0587 3.95984 26.5771 4.02734 27.0054 4.17359C27.4449 4.31984 27.8056 4.47734 28.0761 4.64609C28.3916 4.84859 28.6621 5.08484 28.8763 5.33234L27.3435 6.86234C27.0956 6.54734 26.8364 6.31109 26.5433 6.17609C26.2503 6.02984 25.946 5.96234 25.6079 5.96234C25.3487 5.96234 25.1007 6.01859 24.8415 6.14234C24.5936 6.26609 24.4809 6.45734 24.4809 6.72734C24.4809 6.87359 24.5372 6.99734 24.6499 7.10984C24.7626 7.21109 24.8979 7.28984 25.0556 7.36859C25.2134 7.42484 25.3825 7.48109 25.5515 7.53734C25.7319 7.58234 25.9009 7.62734 26.0474 7.66109L26.0249 7.62734Z" fill="black"/>
        <path d="M16.0606 13.0046H1.49943C0.671589 13.0046 0.000488281 13.6746 0.000488281 14.5009V15.9521C0.000488281 16.7785 0.671589 17.4484 1.49943 17.4484H16.0606C16.8884 17.4484 17.5596 16.7785 17.5596 15.9521V14.5009C17.5596 13.6746 16.8884 13.0046 16.0606 13.0046Z" fill="#F3BDD6"/>
        <path d="M0 1.49625V10.2713C0 11.0976 0.671101 11.7675 1.49895 11.7675H2.95281C3.78066 11.7675 4.45176 11.0976 4.45176 10.2713V1.49625C4.45176 0.669894 3.78066 0 2.95281 0H1.49895C0.671101 0 0 0.669894 0 1.49625Z" fill="#4BD6A1"/>
        <path d="M7.05923 0C12.8521 0 17.5631 4.7025 17.5631 10.485C17.5631 11.1937 16.9883 11.7675 16.2783 11.7675H7.05923C6.3492 11.7675 5.77441 11.1937 5.77441 10.485V1.2825C5.78568 0.585 6.36047 0 7.05923 0Z" fill="#358BFC"/>
      </g>
      <defs>
        <clipPath id="brand-logo-clip0">
          <rect width="135" height="18" fill="white"/>
        </clipPath>
      </defs>
    </svg>
  )
}

function PasswordInput({ value, onChange, showPassword, onToggle, placeholder = '비밀번호 입력', minLength }) {
  return (
    <div style={{ position: 'relative' }}>
      <input
        className="form-input"
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required
        minLength={minLength}
        style={{ paddingRight: 44 }}
      />
      <button
        type="button"
        aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
        onClick={onToggle}
        style={{
          position: 'absolute',
          right: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 28,
          height: 28,
          borderRadius: 6,
          border: '1px solid var(--gray-200)',
          background: '#fff',
          fontSize: 14,
          color: 'var(--gray-500)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <EyeIcon off={showPassword} />
      </button>
    </div>
  )
}

function normalizeRole(value) {
  const role = String(value || '').trim().toUpperCase()
  if (role === 'ADMIN' || role === 'MASTER' || role === 'COMPANY' || role === 'USER') return role
  return null
}

function LoginShell({ children, showBrandLinks = false, subtitle, compact = false, showHeroMark = false }) {
  return (
    <div className="login-page-shell">
      <div className="login-bg-orb login-bg-orb-a" />
      <div className="login-bg-orb login-bg-orb-b" />
      <header className="topbar student-topbar login-topbar">
        <div className="login-topbar-brand">
          <BrandLogo />
        </div>
      </header>

      <main className={`login-main ${compact ? 'compact' : ''}`}>
        <section className="login-hero">
          {showHeroMark && (
            <div className="login-hero-mark">
              <BrandLogo />
            </div>
          )}
          <h1 className="login-hero-title">환영합니다</h1>
          <p className="login-hero-subtitle">
            {subtitle || '아래에서 로그인 또는 가입을 진행해주세요.'}
          </p>
        </section>

        <section className="login-card-shell">
          {children}
        </section>

        {showBrandLinks && (
          <section className="login-brand-links">
            <div className="login-brand-links-head">
              <div className="login-brand-links-title">브랜드 접속 링크</div>
              <div className="login-brand-links-subtitle">접속 후 브랜드 페이지에서 기업/면접자를 선택해 로그인합니다.</div>
            </div>
            <div className="login-brand-link-list">
              {Object.entries(BRAND_LINKS).map(([brand, link]) => (
                <a key={brand} href={link} target="_blank" rel="noreferrer" className="login-brand-link-item">
                  <span>{brand === 'SNIPERFACTORY' ? '스나이퍼팩토리' : '인사이드아웃'}</span>
                  <span className="login-brand-link-cta">접속하기</span>
                </a>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [registerRole, setRegisterRole] = useState('company') // 'company' | 'student'

  const [regName, setRegName] = useState('')
  const [regBirth, setRegBirth] = useState('')
  const [regPhone, setRegPhone] = useState('')

  const detectedBrand = detectBrand()
  const isBrandPortal = !!detectedBrand
  const redirectTo = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    const v = params.get('redirect')
    if (!v) return ''
    if (v.startsWith('/') && !v.startsWith('/login')) return v
    return ''
  }, [])
  const isMeetRedirect = !!redirectTo && redirectTo.startsWith('/meet-record')

  async function handleForgotPassword() {
    setError('')
    if (!email.trim()) {
      setError('비밀번호 찾기를 위해 이메일을 먼저 입력해주세요.')
      return
    }
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/login${detectedBrand ? `?brand=${detectedBrand}` : ''}`,
      })
      if (resetError) throw resetError
      alert('비밀번호 재설정 이메일을 보냈습니다. 메일함을 확인해주세요.')
    } catch (err) {
      console.error('비밀번호 찾기 에러:', err)
      setError('비밀번호 재설정 메일 전송에 실패했습니다.')
    }
  }

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (authError) throw authError

      let userRole = null
      try {
        const { data: userProfile } = await supabase
          .from('users')
          .select('role, metadata')
          .eq('id', data.user.id)
          .maybeSingle()
        userRole = normalizeRole(userProfile?.role) || normalizeRole(userProfile?.metadata?.role)
      } catch (e) {
        console.warn('users 조회 실패:', e)
      }
      if (!userRole) {
        userRole = normalizeRole(data.user.user_metadata?.role) || normalizeRole(data.user.app_metadata?.role)
      }

      if (userRole && !data.user.user_metadata?.role) {
        await supabase.auth.updateUser({ data: { role: userRole } })
      }

      if (redirectTo) {
        navigate(redirectTo, { replace: true })
        return
      }

      if (userRole === 'ADMIN' || userRole === 'MASTER') navigate('/admin')
      else if (userRole === 'COMPANY') navigate('/company')
      else if (userRole === 'USER') navigate('/student')
      else {
        await supabase.auth.signOut()
        setError('계정 권한 정보를 확인하지 못했습니다. 관리자에게 문의해주세요.')
      }
    } catch (err) {
      console.error('로그인 에러:', err)
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e) {
    e.preventDefault()
    if (!detectedBrand) {
      setError('브랜드 전용 페이지에서만 가입할 수 있습니다.')
      return
    }

    const isStudent = registerRole === 'student'

    if (isStudent && (!regName.trim() || !regBirth || !regPhone.trim())) {
      setError('이름, 생년월일, 전화번호를 모두 입력해주세요.')
      return
    }

    setError('')
    setLoading(true)
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      })
      if (signUpError) throw signUpError

      if (data.user) {
        const role = isStudent ? 'USER' : 'COMPANY'
        const metadata = isStudent
          ? { name: regName.trim(), birth: regBirth, phone: regPhone.trim() }
          : {}

        const { error: insertError } = await supabase.from('users').upsert({
          id: data.user.id,
          email: email.trim(),
          name: isStudent ? regName.trim() : null,
          phone: isStudent ? regPhone.trim() : null,
          role,
          brand: detectedBrand,
          metadata,
        })
        if (insertError) console.warn('users upsert 실패:', insertError)

        await supabase.auth.updateUser({
          data: {
            role,
            brand: detectedBrand,
            ...(isStudent ? { name: regName.trim(), birth: regBirth, phone: regPhone.trim() } : {}),
          },
        })
      }

      alert('가입이 완료되었습니다. 이메일을 확인한 뒤 로그인해주세요.')
      setShowRegister(false)
      setPassword('')
      setRegName('')
      setRegBirth('')
      setRegPhone('')
    } catch (err) {
      console.error('가입 에러:', err)
      setError('가입 실패: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (isBrandPortal) {
    const brandName = detectedBrand === 'SNIPERFACTORY' ? '스나이퍼팩토리' : '인사이드아웃'

    return (
      <LoginShell
        subtitle={isMeetRedirect ? '면접실 입장을 위해 로그인해주세요.' : `${brandName} 계정으로 로그인해주세요.`}
        showHeroMark
        compact={false}>
        <div className="login-card">
          {!showRegister ? (
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">이메일</label>
                <input className="form-input" type="email" value={email}
                  onChange={e => setEmail(e.target.value)} placeholder="이메일 입력" required />
              </div>
              <div className="form-group">
                <label className="form-label">비밀번호</label>
                <PasswordInput
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  showPassword={showPassword}
                  onToggle={() => setShowPassword(v => !v)}
                  placeholder="비밀번호 입력"
                />
              </div>
              {error && <div className="error-msg">{error}</div>}
              <button className="login-btn" type="submit" disabled={loading}>
                {loading ? '로그인 중...' : '로그인'}
              </button>
              <div className="login-actions-row">
                <button type="button" className="login-forgot-btn" onClick={handleForgotPassword}>
                  비밀번호 찾기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (detectedBrand === 'INSIDEOUT') {
                      window.location.href = 'https://insideout.or.kr/signup'
                      return
                    }
                    setShowRegister(true)
                    setError('')
                  }}
                  className="login-signup-btn"
                >
                  회원가입
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <div style={{ padding: '12px 16px', background: 'var(--primary-light)', borderRadius: 8, marginBottom: 20, fontSize: 13, color: 'var(--primary)', lineHeight: 1.6 }}>
                {brandName} 전용 계정 가입입니다.
              </div>

              <div className="form-group">
                <label className="form-label">가입 유형</label>
                <div className="seg" style={{ width: 'fit-content' }}>
                  <button type="button" className={`seg-btn ${registerRole === 'company' ? 'on' : ''}`} onClick={() => setRegisterRole('company')}>기업</button>
                  <button type="button" className={`seg-btn ${registerRole === 'student' ? 'on' : ''}`} onClick={() => setRegisterRole('student')}>면접자</button>
                </div>
              </div>

              {registerRole === 'student' && (
                <>
                  <div className="form-group">
                    <label className="form-label">이름</label>
                    <input className="form-input" value={regName} onChange={e => setRegName(e.target.value)} placeholder="홍길동" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">생년월일</label>
                    <input className="form-input" type="date" value={regBirth} onChange={e => setRegBirth(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">전화번호</label>
                    <input className="form-input" value={regPhone} onChange={e => setRegPhone(e.target.value)} placeholder="010-0000-0000" required />
                  </div>
                </>
              )}

              <div className="form-group">
                <label className="form-label">이메일</label>
                <input className="form-input" type="email" value={email}
                  onChange={e => setEmail(e.target.value)} placeholder="이메일 입력" required />
              </div>
              <div className="form-group">
                <label className="form-label">비밀번호</label>
                <PasswordInput
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  showPassword={showPassword}
                  onToggle={() => setShowPassword(v => !v)}
                  placeholder="8자 이상"
                  minLength={8}
                />
              </div>
              {error && <div className="error-msg">{error}</div>}
              <button className="login-btn" type="submit" disabled={loading}>
                {loading ? '가입 중...' : '회원가입'}
              </button>
              <div className="login-actions-row">
                <button type="button" className="login-forgot-btn" onClick={handleForgotPassword}>
                  비밀번호 찾기
                </button>
                <button
                  type="button"
                  onClick={() => { setShowRegister(false); setError('') }}
                  className="login-signup-btn"
                >
                  로그인
                </button>
              </div>
            </form>
          )}
        </div>
      </LoginShell>
    )
  }

  return (
    <LoginShell
      showBrandLinks={!isMeetRedirect}
      subtitle={isMeetRedirect ? '면접실 입장을 위해 로그인해주세요.' : '통합 비즈니스 관리자 플랫폼'}
      showHeroMark
      compact={false}>
      <div className="login-card">
            <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">이메일</label>
            <input className="form-input" type="email" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="이메일 입력" required />
          </div>
          <div className="form-group">
            <label className="form-label">비밀번호</label>
            <PasswordInput
              value={password}
              onChange={e => setPassword(e.target.value)}
              showPassword={showPassword}
              onToggle={() => setShowPassword(v => !v)}
              placeholder="비밀번호 입력"
            />
          </div>
          {error && <div className="error-msg">{error}</div>}
          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
          <div className="login-actions-row">
            <button type="button" className="login-forgot-btn" onClick={handleForgotPassword}>
              비밀번호 찾기
            </button>
          </div>
        </form>
      </div>
    </LoginShell>
  )
}
