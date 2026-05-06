import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

const MEET_SERVER_URL = 'https://meet-server-diix.onrender.com'

const LineIcon = {
  Home: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10.5V20h14v-9.5" />
      <path d="M10 20v-6h4v6" />
    </svg>
  ),
  Calendar: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Bell: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
      <path d="M9 17a3 3 0 0 0 6 0" />
    </svg>
  ),
  Megaphone: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 11v2" />
      <path d="M6 9.5 18 5v14L6 14.5z" />
      <path d="M6 14.5V8.5" />
      <path d="M8.5 15.5 10 20" />
      <path d="M18 9h3" />
    </svg>
  ),
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

function PinIcon() {
  return (
    <svg width="11" height="14" viewBox="0 0 11 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M5.16667 1C2.86942 1 1 2.87908 1 5.20588C1 6.6138 1.66806 8.1862 2.53308 9.61653C3.39021 11.0338 4.40073 12.2472 5.0034 12.9227C5.0946 13.0249 5.23873 13.0249 5.32993 12.9227C5.9326 12.2472 6.94313 11.0338 7.80027 9.61653C8.66527 8.1862 9.33333 6.6138 9.33333 5.20588C9.33333 2.87908 7.46393 1 5.16667 1ZM0 5.20588C0 2.33471 2.30926 0 5.16667 0C8.02407 0 10.3333 2.33471 10.3333 5.20588C10.3333 6.89147 9.54947 8.65653 8.65593 10.134C7.75453 11.6245 6.69993 12.8892 6.0762 13.5884C5.58727 14.1364 4.74607 14.1364 4.25713 13.5884C3.6334 12.8892 2.57879 11.6245 1.67739 10.134C0.783873 8.65653 0 6.89147 0 5.20588Z" fill="#374151"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M5.1665 3.66663C4.3381 3.66663 3.6665 4.3382 3.6665 5.16663C3.6665 5.99503 4.3381 6.66663 5.1665 6.66663C5.9949 6.66663 6.6665 5.99503 6.6665 5.16663C6.6665 4.3382 5.9949 3.66663 5.1665 3.66663ZM2.6665 5.16663C2.6665 3.78591 3.78579 2.66663 5.1665 2.66663C6.54724 2.66663 7.6665 3.78591 7.6665 5.16663C7.6665 6.54736 6.54724 7.66663 5.1665 7.66663C3.78579 7.66663 2.6665 6.54736 2.6665 5.16663Z" fill="#374151"/>
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M8.5 8H3.5C2.65 8 2 7.35 2 6.5V1.5C2 0.65 2.65 0 3.5 0H8.5C9.35 0 10 0.65 10 1.5V6.5C10 7.35 9.35 8 8.5 8ZM3.5 1C3.2 1 3 1.2 3 1.5V6.5C3 6.8 3.2 7 3.5 7H8.5C8.8 7 9 6.8 9 6.5V1.5C9 1.2 8.8 1 8.5 1H3.5Z" fill="#9CA3AF"/>
      <path d="M6.5 10H1.5C1.1 10 0.7 9.85 0.45 9.55C0.15 9.3 0 8.9 0 8.5V3.5C0 3.1 0.15 2.7 0.45 2.45C0.7 2.15 1.1 2 1.5 2H2.5C2.8 2 3 2.2 3 2.5C3 2.8 2.8 3 2.5 3H1.5C1.35 3 1.25 3.05 1.15 3.15C1.05 3.25 1 3.35 1 3.5V8.5C1 8.65 1.05 8.75 1.15 8.85C1.25 8.95 1.35 9 1.5 9H6.5C6.65 9 6.75 8.95 6.85 8.85C6.95 8.75 7 8.65 7 8.5V7.5C7 7.2 7.2 7 7.5 7C7.8 7 8 7.2 8 7.5V8.5C8 8.9 7.85 9.3 7.55 9.55C7.25 9.8 6.9 10 6.5 10Z" fill="#9CA3AF"/>
    </svg>
  )
}

function normalizePhone(v) {
  return String(v || '').replace(/\D/g, '')
}

function normalizeBirth(v) {
  const s = String(v || '').trim()
  if (!s) return ''
  return s.replace(/\./g, '-').replace(/\//g, '-').replace(/\s/g, '')
}

function calculateKoreanAge(birth) {
  const normalized = normalizeBirth(birth)
  if (!normalized) return '-'
  const [y, m, d] = normalized.split('-').map(Number)
  if (!y || !m || !d) return '-'
  const today = new Date()
  let age = today.getFullYear() - y
  const beforeBirthday = today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)
  if (beforeBirthday) age -= 1
  return Number.isFinite(age) && age >= 0 ? `${age}세` : '-'
}

function normalizeCompany(v) {
  return String(v || '').trim().toLowerCase()
}

function parseInviteCodeFromLink(link) {
  if (!link) return ''
  try {
    const url = new URL(link, window.location.origin)
    const room = url.searchParams.get('room')
    if (room) return String(room).trim()
    return ''
  } catch {
    const m = String(link).match(/[?&]room=([^&#]+)/i)
    return m?.[1] ? decodeURIComponent(m[1]).trim() : ''
  }
}

function makeDateKey(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function parseDateSafe(v) {
  if (!v) return null
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return null
  return d
}

function formatDateTimeNoSeconds(v) {
  const d = parseDateSafe(v)
  if (!d) return ''
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatRelativeTimeLabel(value) {
  const d = parseDateSafe(value)
  if (!d) return ''
  const diffMs = new Date().getTime() - d.getTime()
  const absMs = Math.abs(diffMs)
  const minutes = Math.floor(absMs / (60 * 1000))
  const hours = Math.floor(absMs / (60 * 60 * 1000))
  const days = Math.floor(absMs / (24 * 60 * 60 * 1000))
  const suffix = diffMs >= 0 ? '전' : '후'

  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 ${suffix}`
  if (hours < 24) return `${hours}시간 ${suffix}`
  if (days < 7) return `${days}일 ${suffix}`
  return d.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
}

function DateCalendar({
  selectableDates,
  selectedDate,
  onSelectDate,
  viewYear,
  viewMonth,
  onChangeMonth,
}) {
  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
  const weekDays = ['일', '월', '화', '수', '목', '금', '토']
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div style={{ border: '1px solid var(--gray-200)', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--gray-100)', background: 'var(--gray-50)' }}>
        <button type="button" onClick={() => onChangeMonth(-1)}
          style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--gray-200)', background: '#fff', cursor: 'pointer' }}>
          ‹
        </button>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-900)' }}>{viewYear}년 {monthNames[viewMonth]}</span>
        <button type="button" onClick={() => onChangeMonth(1)}
          style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--gray-200)', background: '#fff', cursor: 'pointer' }}>
          ›
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '8px 10px 2px' }}>
        {weekDays.map((w, idx) => (
          <div key={w} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: idx === 0 ? 'var(--danger-text)' : idx === 6 ? 'var(--primary)' : 'var(--gray-500)', padding: '2px 0' }}>
            {w}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, padding: '0 10px 10px' }}>
        {cells.map((d, idx) => {
          if (!d) return <div key={`empty-${idx}`} />
          const dateKey = makeDateKey(viewYear, viewMonth, d)
          const selectable = selectableDates.has(dateKey)
          const isSelected = selectedDate === dateKey
          return (
            <button
              key={dateKey}
              type="button"
              disabled={!selectable}
              onClick={() => onSelectDate(dateKey)}
              style={{
                height: 34,
                borderRadius: 8,
                border: `1.5px solid ${isSelected ? 'var(--primary)' : selectable ? 'var(--gray-200)' : 'transparent'}`,
                background: isSelected ? 'var(--primary)' : selectable ? '#fff' : 'transparent',
                color: isSelected ? '#fff' : selectable ? 'var(--gray-700)' : 'var(--gray-300)',
                fontSize: 12,
                fontWeight: isSelected ? 700 : 500,
                cursor: selectable ? 'pointer' : 'not-allowed',
              }}>
              {d}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ScheduleSelectModal({
  open,
  row,
  slotState,
  selectedDate,
  selectedSlot,
  onClose,
  onPickDate,
  onPickSlot,
  onChangeMonth,
  onSubmit,
  submitting,
  canEdit,
  isBooked,
  isEditMode,
}) {
  if (!open || !row) return null

  const selectedDateSlots = (slotState?.slots || []).filter(s => s.date === selectedDate)
  const selectableDates = new Set((slotState?.slots || []).map(s => s.date))

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.45)', backdropFilter: 'blur(4px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="schedule-select-modal" style={{ width: '100%', maxWidth: 980, maxHeight: '82vh', background: '#fff', borderRadius: 16, border: '1px solid var(--gray-200)', boxShadow: '0 20px 44px rgba(2,6,23,.22)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="schedule-select-modal-header" style={{ padding: '16px 18px', borderBottom: '1px solid var(--gray-200)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--gray-900)' }}>{row.companyName}</div>
            <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>
              {row.program?.title || '-'} · {isBooked ? (isEditMode ? '일정 수정' : '일정 확인') : '일정 선택'}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>닫기</button>
        </div>

        <div style={{ padding: 18, flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {!row.setting ? (
            <div style={{ fontSize: 13, color: 'var(--gray-400)' }}>기업의 면접 일정 확정 후 선택이 가능합니다.</div>
          ) : !canEdit && (isEditMode || !isBooked) ? (
            <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 12, padding: '12px 14px', fontSize: 13, color: 'var(--gray-600)' }}>
              제출 마감일이 지나 일정 변경/선택이 불가능합니다.
            </div>
          ) : (
            <div className="schedule-select-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(320px, 1fr)', gap: 14, alignItems: 'stretch', height: '100%', minHeight: 0 }}>
              <DateCalendar
                selectableDates={selectableDates}
                selectedDate={selectedDate}
                onSelectDate={(date) => onPickDate(row.app.id, date)}
                viewYear={slotState?.viewYear || new Date().getFullYear()}
                viewMonth={slotState?.viewMonth ?? new Date().getMonth()}
                onChangeMonth={(delta) => onChangeMonth(row, delta)}
              />
              <div className="schedule-select-time-panel" style={{ border: '1px solid var(--gray-200)', borderRadius: 12, background: '#fff', padding: 14, display: 'flex', flexDirection: 'column', minHeight: 0, maxHeight: '52vh' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-800)', marginBottom: 10, flexShrink: 0 }}>
                  {selectedDate ? `${selectedDate} 시간 선택` : '시간 선택'}
                </div>
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 4 }}>
                  {selectedDate ? (
                    selectedDateSlots.length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>선택한 날짜에 선택 가능한 시간이 없습니다.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {selectedDateSlots.map(slot => {
                          const selected = selectedSlot?.date === slot.date && selectedSlot?.start === slot.start
                          const full = slot.capacity > 0 && slot.bookedCount >= slot.capacity
                          return (
                            <button
                              key={`${slot.date}-${slot.start}`}
                              type="button"
                              disabled={full}
                              onClick={() => onPickSlot(row.app.id, slot)}
                              style={{
                                borderRadius: 10,
                                border: `1px solid ${selected ? 'var(--primary)' : 'var(--gray-200)'}`,
                                background: selected ? 'var(--primary-light)' : '#fff',
                                padding: '10px 12px',
                                textAlign: 'left',
                                cursor: full ? 'not-allowed' : 'pointer',
                                opacity: full ? 0.55 : 1,
                              }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: selected ? 'var(--primary)' : 'var(--gray-800)' }}>
                                {slot.start} ~ {slot.end}
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 3 }}>
                                {slot.capacity > 0 ? `${slot.bookedCount}/${slot.capacity} 선택 가능` : '선택 가능'}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>먼저 날짜를 선택해주세요.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '14px 18px', borderTop: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'flex-end', gap: 8, background: '#fff' }}>
          {isBooked && isEditMode && (
            <button className="btn btn-ghost" onClick={onClose}>취소</button>
          )}
          <button
            className="btn btn-primary"
            disabled={!selectedSlot || submitting || (!canEdit && (isEditMode || !isBooked))}
            onClick={() => onSubmit(row, selectedSlot)}
          >
            {submitting ? '예약 중...' : (isBooked ? '일정 수정 제출' : '제출하기')}
          </button>
        </div>
      </div>
    </div>
  )
}

function MyInterviews({
  rows,
  scheduleMap,
  canEditByProgram,
  editModeMap,
  onToggleEdit,
  submissionDeadlineText,
  onOpenSchedule,
  onJoinMeeting,
  onCopyValue,
  deadlineRaw,
  sectionId = 'student-interview-section',
}) {
  const deadlineDate = parseDateSafe(deadlineRaw)
  const dday = deadlineDate
    ? Math.ceil((deadlineDate.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000))
    : null
  const ddayLabel = dday === null
    ? 'D-?'
    : dday === 0
      ? 'D-Day'
      : dday > 0
        ? `D-${dday}`
        : `D+${Math.abs(dday)}`

  return (
    <div id={sectionId} className="student-home-section">
      <div className="student-section-head page-header">
        <div>
          <div className="section-title student-main-title">내 면접</div>
        </div>
      </div>

      {submissionDeadlineText && (
        <div className="deadline-banner">
          <div className="deadline-badge">{ddayLabel}</div>
          <div className="deadline-copy">
            <div className="deadline-title">
              면접자 일정 제출 마감일은 <span>{submissionDeadlineText}</span> 까지입니다.
            </div>
            <div className="deadline-subtitle">
              마감일 이후에는 일정 변경이 어렵고, 일정을 선택하지 않으면 중도 포기로 간주될 수 있습니다.
            </div>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="card">
          <div className="empty">
            <div className="empty-title">매칭된 면접 정보가 없습니다.</div>
            <div className="empty-desc">이름/생년월일/전화번호가 지원서와 일치하는지 확인해주세요.</div>
          </div>
        </div>
      ) : (
        <div className="my-interview-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 18, alignItems: 'stretch', marginTop: 18 }}>
          {rows.map(row => {
            const schedule = scheduleMap[row.app.id]
            const canEdit = canEditByProgram[row.app.program_id] ?? true
            const isBooked = !!schedule
            const isEditMode = !!editModeMap[row.app.id]
            const selectionStatus = isBooked ? '일정 선택 완료' : '일정 선택 전'
            const isEvalShared = !!row.app.form_data?.evaluation_shared
            const stageText = isEvalShared ? (row.app.stage || '평가 전') : '평가 전'
            const modeText = row.setting?.interview_mode === 'online' ? '비대면' : '대면'
            const typeText = row.setting?.interview_type === '1on1'
              ? '1:1'
              : `그룹(최대 ${row.setting?.group_max_count || '-'}명)`
            const minutesText = row.setting?.slot_minutes ? `${row.setting.slot_minutes}분` : null
            const metaLine = [stageText, modeText, typeText, minutesText].filter(Boolean).join(' · ')
            return (
              <div key={row.app.id} className="card student-interview-card" style={{ overflow: 'hidden', borderRadius: 20 }}>
                <div className="card-header my-interview-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div>
                    <div className="card-title student-company-title">{row.companyName}</div>
                    <div className="student-company-subtitle">{row.program?.title || '-'}</div>
                  </div>
                  <div className="my-interview-card-meta" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, textAlign: 'right' }}>
                    <span className={`badge ${selectionStatus === '일정 선택 완료' ? 'b-green' : 'b-gray'}`}>
                      {selectionStatus}
                    </span>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', lineHeight: 1.35 }}>
                      {metaLine}
                    </div>
                  </div>
                </div>

                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {isBooked && (
                    <div className="student-interview-panel">
                      <div className="student-interview-panel-label">내 면접 일정</div>
                      <div className="student-interview-row">
                        <span className="student-interview-row-icon"><LineIcon.Calendar /></span>
                        <span className="student-interview-row-text">
                          {schedule.scheduled_date} {schedule.scheduled_start_time} - {schedule.scheduled_end_time}
                        </span>
                      </div>
                      {row.setting?.interview_mode === 'online' && (
                        <div className="student-interview-row student-interview-row-inline">
                          <div className="student-interview-row-left">
                            <span className="student-interview-row-icon"><PinIcon /></span>
                            <span className="student-interview-row-text">{row.setting?.face_address || '비대면'}</span>
                          </div>
                          <div className="student-invite-code">
                            <span>초대코드 : {parseInviteCodeFromLink(schedule?.meeting_link) || '-'}</span>
                              <button
                              type="button"
                              className="student-invite-copy-btn"
                              aria-label="초대코드 복사"
                              onClick={() => {
                                const code = parseInviteCodeFromLink(schedule?.meeting_link) || ''
                                onCopyValue?.(code, '초대코드가 복사되었습니다.')
                              }}>
                              <CopyIcon />
                            </button>
                          </div>
                        </div>
                      )}
                      {row.setting?.interview_mode === 'online' && (
                        <button
                          type="button"
                          className="student-meet-link-btn"
                          onClick={() => onJoinMeeting?.(row, schedule)}
                          disabled={false}>
                          화상 링크 접속
                        </button>
                      )}
                      {row.setting?.interview_mode === 'face' && (schedule.face_address || row.setting?.face_address) && (
                        <div className="student-interview-row student-interview-row-inline student-interview-row-face">
                          <div className="student-interview-row-left">
                            <span className="student-interview-row-icon"><PinIcon /></span>
                            <span className="student-interview-row-text">{schedule.face_address || row.setting?.face_address}</span>
                          </div>
                          <button
                            type="button"
                            className="student-invite-copy-btn"
                            aria-label="장소 복사"
                            onClick={() => {
                              const value = schedule.face_address || row.setting?.face_address || ''
                              onCopyValue?.(value, '대면 장소가 복사되었습니다.')
                            }}>
                            <CopyIcon />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {!row.setting ? (
                    <div style={{ fontSize: 13, color: 'var(--gray-400)' }}>기업의 면접 일정 확정 후 선택이 가능합니다.</div>
                  ) : !canEdit ? (
                    <div className="student-card-footnote">
                      제출 마감일이 지나 수정이 불가능합니다.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      {isBooked && canEdit && !isEditMode && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => { onToggleEdit(row.app.id, true); onOpenSchedule(row) }}>
                          수정하기
                        </button>
                      )}
                      {(!isBooked || isEditMode) && (
                        <>
                          <button className="btn btn-primary btn-sm" onClick={() => onOpenSchedule(row)}>
                            면접 일정 선택하기
                          </button>
                          {isBooked && isEditMode && (
                            <button className="btn btn-ghost btn-sm" onClick={() => onToggleEdit(row.app.id, false)}>
                              취소
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StudentNotices({ brand, compact = false, onMore }) {
  const [loading, setLoading] = useState(true)
  const [notices, setNotices] = useState([])
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        let query = supabase
          .from('notices')
          .select('*')
          .in('type', ['interview-all', 'interview-students'])
          .eq('is_archived', false)
          .eq('is_hidden', false)
          .order('is_fixed', { ascending: false })
          .order('created_at', { ascending: false })
        if (brand) query = query.eq('brand', brand)
        const { data, error } = await query
        if (error) throw error
        setNotices(data || [])
      } catch (e) {
        console.error('공지 조회 실패:', e)
        setNotices([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [brand])

  if (selected) {
    return (
      <div id="student-notice-section" className={compact ? 'student-home-section' : ''}>
        <div className="page-header">
          <div>
            <div className="page-title">공지사항</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {compact && (
              <button className="btn btn-secondary" onClick={onMore}>더보기</button>
            )}
            <button className="btn btn-secondary" onClick={() => setSelected(null)}>목록으로</button>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <h2 className="student-notice-detail-title">{selected.title}</h2>
            <div className="student-notice-detail-meta">
              {new Date(selected.created_at).toLocaleDateString('ko-KR')} · {selected.author_name || '운영진'}
            </div>
            <div className="student-notice-detail-content" dangerouslySetInnerHTML={{ __html: selected.content }} />
          </div>
        </div>
      </div>
    )
  }

  if (compact) {
    const previewItems = notices.slice(0, 4)
    return (
      <div id="student-notice-section" className="student-home-section">
        <div className="student-notice-section-head">
          <div>
            <div className="section-title student-notice-title">공지사항</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onMore}>더보기</button>
        </div>

        <div className="student-notice-list">
          {loading ? (
            <div className="card student-notice-empty-card">
              <div className="empty">
                <div className="empty-title">불러오는 중...</div>
              </div>
            </div>
          ) : previewItems.length === 0 ? (
            <div className="card student-notice-empty-card">
              <div className="empty">
                <div className="empty-title">공지사항이 없습니다.</div>
              </div>
            </div>
          ) : (
            previewItems.map((n) => (
              <button
                key={n.id}
                type="button"
                className={`student-notice-row ${n.is_fixed ? 'fixed' : ''}`}
                onClick={() => setSelected(n)}
              >
                <div className="student-notice-row-main">
                  <div className="student-notice-row-meta">
                    {n.is_fixed && <span className="badge b-blue notice-pill">필독</span>}
                    {n.is_fixed && <span className="student-notice-dot">·</span>}
                    <span>{formatRelativeTimeLabel(n.created_at)}</span>
                  </div>
                  <div className="student-notice-row-title">{n.title}</div>
                </div>
                <div className={`student-notice-row-state ${n.is_fixed ? 'unread' : 'read'}`}>
                  {n.is_fixed ? '안읽음' : '읽음'}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    )
  }

  return (
      <div>
        <div className="page-header">
          <div>
            <div className="page-title">공지사항</div>
          </div>
        </div>
      <div className="student-notice-flat-shell">
        {loading ? (
          <div className="student-notice-empty-card">
            <div className="empty"><div className="empty-title">불러오는 중...</div></div>
          </div>
        ) : notices.length === 0 ? (
          <div className="student-notice-empty-card">
            <div className="empty"><div className="empty-title">공지사항이 없습니다.</div></div>
          </div>
        ) : (
          <div className="student-notice-flat-list">
            {notices.map((n, idx) => (
              <button
                key={n.id}
                type="button"
                className={`student-notice-row ${n.is_fixed ? 'fixed' : ''}`}
                onClick={() => setSelected(n)}
              >
                <div className="student-notice-row-main">
                  <div className="student-notice-row-meta">
                    {n.is_fixed && <span className="badge b-blue notice-pill">필독</span>}
                    {n.is_fixed && <span className="student-notice-dot">·</span>}
                    <span>{n.author_name || '운영진'}</span>
                    <span className="student-notice-dot">·</span>
                    <span>{new Date(n.created_at).toLocaleDateString('ko-KR')}</span>
                  </div>
                  <div className="student-notice-row-title">{n.title}</div>
                </div>
                <div className="student-notice-row-state read">
                  {n.is_fixed ? '필독' : notices.length - idx}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function downloadDataUrl(dataUrl, filename) {
  try {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = filename || 'download'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  } catch (e) {
    console.warn(e)
  }
}

function wrapPdfLines(text, maxLen = 46) {
  const out = []
  const raw = String(text || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
  for (const line of raw) {
    if (!line) {
      out.push('')
      continue
    }
    let s = line
    while (s.length > maxLen) {
      out.push(s.slice(0, maxLen))
      s = s.slice(maxLen)
    }
    out.push(s)
  }
  return out
}

async function loadJsPdf() {
  if (typeof window === 'undefined') return null
  if (window.jspdf?.jsPDF) return window.jspdf.jsPDF
  await new Promise((resolve, reject) => {
    const src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      existing.addEventListener('load', resolve)
      existing.addEventListener('error', reject)
      return
    }
    const s = document.createElement('script')
    s.src = src
    s.crossOrigin = 'anonymous'
    s.onload = resolve
    s.onerror = reject
    document.head.appendChild(s)
  })
  return window.jspdf?.jsPDF || null
}

function AiReportModal({
  open,
  row,
  schedule,
  report,
  loading,
  error,
  onClose,
}) {
  const [ssOpen, setSsOpen] = useState(false)
  const [ssChecked, setSsChecked] = useState([])

  if (!open || !row) return null

  const programTitle = row.program?.title || '-'
  const companyName = row.companyName || '-'
  const interviewDate = schedule?.scheduled_date || '-'
  const startTime = schedule?.scheduled_start_time || ''
  const endTime = schedule?.scheduled_end_time || ''
  const durationMin = report?.duration_minutes || null

  const keywords = Array.isArray(report?.report_json?.keywords) ? report.report_json.keywords : []
  const scores = Array.isArray(report?.report_json?.scores) ? report.report_json.scores : []
  const strengths = Array.isArray(report?.report_json?.strengths) ? report.report_json.strengths : []
  const improvements = Array.isArray(report?.report_json?.improvements) ? report.report_json.improvements : []
  const risk = report?.report_json?.riskDetail || null
  const totalScore = report?.report_json?.totalScore ?? null
  const verdict = report?.report_json?.verdict || ''

  const transcripts = Array.isArray(report?.transcripts) ? report.transcripts : []
  const behaviorLogs = Array.isArray(report?.behavior_logs) ? report.behavior_logs : []
  const screenshots = Array.isArray(report?.screenshots) ? report.screenshots : []

  const transcriptSorted = transcripts
    .map((t) => ({
      ...t,
      _ts: t?.ts ? new Date(t.ts) : null,
    }))
    .sort((a, b) => (a._ts?.getTime?.() || 0) - (b._ts?.getTime?.() || 0))

  async function onDownloadPdf() {
    try {
      const JsPDF = await loadJsPdf()
      if (!JsPDF) {
        alert('PDF 모듈을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
        return
      }
      const doc = new JsPDF({ unit: 'pt', format: 'a4' })
      const margin = 44
      const pageW = doc.internal.pageSize.getWidth()
      const pageH = doc.internal.pageSize.getHeight()
      const maxW = pageW - margin * 2
      let y = margin

      const write = (lines, fontSize = 11, gap = 6) => {
        doc.setFontSize(fontSize)
        for (const line of lines) {
          if (y > pageH - margin) {
            doc.addPage()
            y = margin
          }
          doc.text(String(line), margin, y, { maxWidth: maxW })
          y += fontSize + gap
        }
      }

      write([`${programTitle} — AI 면접 리포트`], 14, 8)
      write([`${companyName}`, `${interviewDate} ${startTime}${endTime ? ` ~ ${endTime}` : ''}${durationMin ? ` · ${durationMin}분` : ''}`], 11, 6)
      y += 6

      if (keywords.length) {
        write(['[키워드]'], 12, 6)
        write(wrapPdfLines(keywords.join(' / '), 60), 10, 4)
        y += 6
      }
      if (report?.summary_raw) {
        write(['[AI 요약본]'], 12, 6)
        write(wrapPdfLines(report.summary_raw, 70), 10, 4)
        y += 6
      }
      if (scores.length) {
        write(['[항목별 점수]'], 12, 6)
        scores.forEach((s) => write([`- ${s.criterion || '항목'}: ${s.score ?? '-'} / 5`], 10, 4))
        y += 6
      }
      if (strengths.length) {
        write(['[강점]'], 12, 6)
        strengths.forEach((t) => write([`- ${t}`], 10, 4))
        y += 6
      }
      if (improvements.length) {
        write(['[보완점]'], 12, 6)
        improvements.forEach((t) => write([`- ${t}`], 10, 4))
        y += 6
      }
      if (risk?.level) {
        write(['[위험감지]'], 12, 6)
        write([`레벨: ${risk.level}`], 10, 4)
        if (Array.isArray(risk.factors) && risk.factors.length) {
          risk.factors.forEach((t) => write([`- ${t}`], 10, 4))
        }
        if (risk.evidence) write(wrapPdfLines(String(risk.evidence), 70), 10, 4)
        y += 6
      }
      write(['[종합]'], 12, 6)
      write([`종합점수: ${totalScore ?? '-'} / 100`, `판정: ${verdict || '-'}`], 10, 4)

      doc.save(`${companyName}_AI리포트_${interviewDate || ''}.pdf`)
    } catch (e) {
      alert(`PDF 다운로드 실패: ${e.message}`)
    }
  }

  function toggleSs(idx) {
    setSsChecked((prev) => prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx])
  }

  function downloadSelectedScreenshots() {
    const targets = ssChecked.length ? ssChecked : []
    if (!targets.length) return
    targets.sort((a, b) => a - b).forEach((idx) => {
      const url = screenshots[idx]
      if (url) downloadDataUrl(url, `screenshot_${idx + 1}.jpg`)
    })
  }

  function downloadAllScreenshots() {
    screenshots.forEach((url, idx) => {
      if (url) downloadDataUrl(url, `screenshot_${idx + 1}.jpg`)
    })
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.55)', backdropFilter: 'blur(6px)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}
    >
      <div style={{ width: '100%', maxWidth: 1120, maxHeight: '86vh', background: '#fff', borderRadius: 16, border: '1px solid var(--gray-200)', boxShadow: '0 24px 60px rgba(2,6,23,.28)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--gray-200)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--gray-500)' }}>[{programTitle}]</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--gray-900)', marginTop: 2 }}>AI 면접 리포트</div>
            <div style={{ fontSize: 12, color: 'var(--gray-600)', marginTop: 6 }}>
              {interviewDate} {startTime}{endTime ? ` ~ ${endTime}` : ''}{durationMin ? ` · 총 소요 ${durationMin}분` : ''}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setSsOpen(true)} disabled={!screenshots.length || loading}>
              스크린샷 확인하기
            </button>
            <button className="btn btn-primary btn-sm" onClick={onDownloadPdf} disabled={loading}>
              PDF 다운로드
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>닫기</button>
          </div>
        </div>

        <div style={{ padding: 18, background: 'var(--gray-50)', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {loading ? (
            <div className="card"><div className="empty"><div className="empty-title">불러오는 중...</div></div></div>
          ) : error ? (
            <div className="card"><div className="empty"><div className="empty-title">리포트를 불러오지 못했습니다.</div><div className="empty-desc">{error}</div></div></div>
          ) : !report ? (
            <div className="card"><div className="empty"><div className="empty-title">AI 면접 리포트가 없습니다.</div></div></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 14, height: '100%' }}>
              <div className="card" style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <div className="card-header" style={{ flexShrink: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="card-title">키워드 · 대화록</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>{companyName}</div>
                  </div>
                </div>
                <div className="card-body" style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {keywords.length ? keywords.map((k, idx) => (
                      <span key={`${k}-${idx}`} className="badge b-blue" style={{ fontSize: 11 }}>{k}</span>
                    )) : <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>키워드 없음</span>}
                  </div>
                  <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', border: '1px solid var(--gray-200)', borderRadius: 12, background: '#fff', padding: 12 }}>
                    {transcriptSorted.length ? transcriptSorted.map((t, idx) => (
                      <div key={idx} style={{ padding: '6px 0', borderBottom: idx === transcriptSorted.length - 1 ? 'none' : '1px solid var(--gray-100)' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-800)' }}>
                          {t.speaker || '-'}
                          {t._ts && (
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-400)', marginLeft: 8 }}>
                              {t._ts.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--gray-700)', marginTop: 3, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                          {t.text || ''}
                        </div>
                      </div>
                    )) : (
                      <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>대화록이 없습니다.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="card" style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <div className="card-header" style={{ flexShrink: 0 }}>
                  <div className="card-title">AI 분석</div>
                </div>
                <div className="card-body" style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                    <div style={{ border: '1px solid var(--gray-200)', borderRadius: 12, background: '#fff', padding: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', marginBottom: 6 }}>종합점수</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--gray-900)' }}>{totalScore ?? '-'}</div>
                    </div>
                    <div style={{ border: '1px solid var(--gray-200)', borderRadius: 12, background: '#fff', padding: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', marginBottom: 6 }}>판정</div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--gray-900)' }}>{verdict || '-'}</div>
                    </div>
                  </div>

                  <div style={{ border: '1px solid var(--gray-200)', borderRadius: 12, background: '#fff', padding: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--gray-800)', marginBottom: 8 }}>AI 요약본</div>
                    <div style={{ fontSize: 13, color: 'var(--gray-700)', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                      {report.summary_raw || '-'}
                    </div>
                  </div>

                  <div style={{ border: '1px solid var(--gray-200)', borderRadius: 12, background: '#fff', padding: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--gray-800)', marginBottom: 8 }}>항목별 점수</div>
                    {scores.length ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {scores.map((s, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 10px', border: '1px solid var(--gray-200)', borderRadius: 10, background: 'var(--gray-50)' }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-800)' }}>{s.criterion || '항목'}</div>
                            <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--primary)' }}>{s.score ?? '-'}/5</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>점수 정보가 없습니다.</div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
                    <div style={{ border: '1px solid var(--gray-200)', borderRadius: 12, background: '#fff', padding: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--gray-800)', marginBottom: 8 }}>강점</div>
                      {strengths.length ? strengths.map((t, idx) => (
                        <div key={idx} style={{ fontSize: 13, color: 'var(--gray-700)', lineHeight: 1.7 }}>- {t}</div>
                      )) : <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>없음</div>}
                    </div>
                    <div style={{ border: '1px solid var(--gray-200)', borderRadius: 12, background: '#fff', padding: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--gray-800)', marginBottom: 8 }}>보완점</div>
                      {improvements.length ? improvements.map((t, idx) => (
                        <div key={idx} style={{ fontSize: 13, color: 'var(--gray-700)', lineHeight: 1.7 }}>- {t}</div>
                      )) : <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>없음</div>}
                    </div>
                  </div>

                  <div style={{ border: '1px solid var(--gray-200)', borderRadius: 12, background: '#fff', padding: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--gray-800)', marginBottom: 8 }}>위험감지</div>
                    <div style={{ fontSize: 13, color: 'var(--gray-700)' }}>
                      레벨: <b style={{ color: 'var(--gray-900)' }}>{risk?.level || '-'}</b>
                    </div>
                    {Array.isArray(risk?.factors) && risk.factors.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        {risk.factors.map((t, idx) => (
                          <div key={idx} style={{ fontSize: 13, color: 'var(--gray-700)', lineHeight: 1.7 }}>- {t}</div>
                        ))}
                      </div>
                    )}
                    {risk?.evidence && (
                      <div style={{ marginTop: 8, fontSize: 13, color: 'var(--gray-700)', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                        {String(risk.evidence)}
                      </div>
                    )}
                  </div>

                  <div style={{ border: '1px solid var(--gray-200)', borderRadius: 12, background: '#fff', padding: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--gray-800)', marginBottom: 8 }}>종합 평가</div>
                    <div style={{ fontSize: 13, color: 'var(--gray-700)', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                      {report?.report_json?.summary || '-'}
                    </div>
                  </div>

                  <div style={{ border: '1px solid var(--gray-200)', borderRadius: 12, background: '#fff', padding: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--gray-800)', marginBottom: 8 }}>행동 로그</div>
                    {behaviorLogs.length ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {behaviorLogs.map((b, idx) => (
                          <div key={idx} style={{ fontSize: 12, color: 'var(--gray-700)', background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 10, padding: '8px 10px', whiteSpace: 'pre-wrap' }}>
                            {typeof b === 'string' ? b : JSON.stringify(b)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>없음</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {ssOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.65)', zIndex: 4500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}
          onClick={(e) => { if (e.target === e.currentTarget) setSsOpen(false) }}
        >
          <div style={{ width: '100%', maxWidth: 980, maxHeight: '86vh', background: '#fff', borderRadius: 16, border: '1px solid var(--gray-200)', boxShadow: '0 24px 60px rgba(2,6,23,.28)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 900 }}>스크린샷 미리보기</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary btn-sm" disabled={!ssChecked.length} onClick={downloadSelectedScreenshots}>선택 다운로드</button>
                <button className="btn btn-primary btn-sm" onClick={downloadAllScreenshots}>전체 다운로드</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setSsOpen(false)}>닫기</button>
              </div>
            </div>
            <div style={{ padding: 16, background: 'var(--gray-50)', flex: 1, minHeight: 0, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                {screenshots.map((url, idx) => {
                  const checked = ssChecked.includes(idx)
                  return (
                    <div key={idx} style={{ border: '1px solid var(--gray-200)', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
                      <div style={{ position: 'relative', background: '#000' }}>
                        <img src={url} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
                        <label style={{ position: 'absolute', top: 10, left: 10, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.9)', padding: '6px 8px', borderRadius: 999, border: '1px solid var(--gray-200)', cursor: 'pointer' }}>
                          <input type="checkbox" checked={checked} onChange={() => toggleSs(idx)} style={{ width: 14, height: 14, accentColor: 'var(--primary)' }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-800)' }}>선택</span>
                        </label>
                      </div>
                      <div style={{ padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ fontSize: 12, color: 'var(--gray-600)' }}>#{idx + 1}</div>
                        <button className="btn btn-secondary btn-sm" onClick={() => downloadDataUrl(url, `screenshot_${idx + 1}.jpg`)}>다운로드</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function StudentRouter() {
  const { user, profile, brand, signOut } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [menu, setMenu] = useState('home')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [selectedProgramId, setSelectedProgramId] = useState(() => String(searchParams.get('program') || '').trim())
  const [rows, setRows] = useState([])
  const [programMap, setProgramMap] = useState({})
  const [scheduleMap, setScheduleMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [submittingId, setSubmittingId] = useState('')
  const [toast, setToast] = useState('')

  const [slotLoadMap, setSlotLoadMap] = useState({})
  const [selectedDateMap, setSelectedDateMap] = useState({})
  const [selectedSlotMap, setSelectedSlotMap] = useState({})
  const [editModeMap, setEditModeMap] = useState({})
  const [showAlertPanel, setShowAlertPanel] = useState(false)
  const [courseDropdownOpen, setCourseDropdownOpen] = useState(false)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const [alerts, setAlerts] = useState([])
  const [alertUnread, setAlertUnread] = useState(0)
  const [isTabletMobile, setIsTabletMobile] = useState(() => window.innerWidth <= 1024)
  const [alertPanelPos, setAlertPanelPos] = useState({ top: 0, left: 0 })
  const alertBtnRef = useRef(null)
  const topAlertBtnRef = useRef(null)
  const alertPanelRef = useRef(null)
  const sidebarRef = useRef(null)
  const courseDropdownRef = useRef(null)
  const courseTriggerRef = useRef(null)
  const profileDropdownRef = useRef(null)
  const profileTriggerRef = useRef(null)
  const toastTimerRef = useRef(null)

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [scheduleModalRow, setScheduleModalRow] = useState(null)
  const [aiReportOpen, setAiReportOpen] = useState(false)
  const [aiReportRow, setAiReportRow] = useState(null)
  const [aiReportLoading, setAiReportLoading] = useState(false)
  const [aiReportError, setAiReportError] = useState('')
  const [aiReport, setAiReport] = useState(null)
  const [aiReportExistsMap, setAiReportExistsMap] = useState({})
  const rowAppIdsKey = useMemo(() => (
    rows.map(r => r?.app?.id).filter(Boolean).sort().join(',')
  ), [rows])

  function showToast(msg) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast(msg)
    toastTimerRef.current = setTimeout(() => setToast(''), 2600)
  }

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
  }, [])

  async function copyWithToast(value, successMessage) {
    if (!value) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
      } else {
        const el = document.createElement('textarea')
        el.value = value
        el.setAttribute('readonly', 'true')
        el.style.position = 'fixed'
        el.style.left = '-9999px'
        el.style.opacity = '0'
        document.body.appendChild(el)
        el.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(el)
        if (!ok) throw new Error('copy failed')
      }
      showToast(successMessage)
    } catch {
      showToast('복사에 실패했습니다.')
    }
  }

  const myName = profile?.name || profile?.metadata?.name || user?.user_metadata?.name || ''
  const myBirth = normalizeBirth(profile?.metadata?.birth || user?.user_metadata?.birth || '')
  const myPhone = normalizePhone(profile?.phone || profile?.metadata?.phone || user?.user_metadata?.phone || '')
  const myEmail = profile?.email || user?.email || ''
  const myAvatarUrl = profile?.avatar_url || profile?.metadata?.avatar_url || user?.user_metadata?.avatar_url || ''
  const profileBrand = normalizeCompany(brand)
  const profileInfo = useMemo(() => ({
    name: myName || myEmail || '프로필',
    avatarUrl: myAvatarUrl,
    phone: myPhone || '-',
    email: myEmail || '-',
    birth: myBirth || '-',
    age: calculateKoreanAge(myBirth),
  }), [myName, myEmail, myAvatarUrl, myPhone, myBirth])
  const appIds = useMemo(() => rows.map((r) => r?.app?.id).filter(Boolean), [rowAppIdsKey])

  const renderAlertPanel = () => {
    if (!showAlertPanel) return null
    return createPortal(
      <div
        ref={alertPanelRef}
        className="student-alert-panel"
        style={{
          position: 'fixed',
          left: alertPanelPos.left,
          top: alertPanelPos.top,
          width: 'min(392px, calc(100vw - 24px))',
          maxHeight: 540,
          overflow: 'hidden',
          background: 'rgba(255,255,255,0.92)',
          border: '1px solid rgba(255,255,255,0.72)',
          borderRadius: 22,
          boxShadow: '0 30px 90px rgba(15,23,42,.18)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          zIndex: 99999,
        }}>
        <div className="student-alert-panel-head">
          <div className="student-alert-panel-head-copy">
            <div className="student-alert-panel-title">일정 알림</div>
            <div className="student-alert-panel-subtitle">실시간 업데이트</div>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--gray-500)', fontWeight: 600, whiteSpace: 'nowrap' }}>실시간 업데이트</span>
            <button
              type="button"
              onClick={loadAlerts}
              aria-label="알림 새로고침"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 9, border: '1px solid rgba(191,219,254,.82)', background: 'rgba(239,246,255,.92)', color: 'var(--primary)', boxShadow: '0 8px 16px rgba(37,99,235,.08)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.5 9a9 9 0 0 1 14.1-3.36L23 10M1 14l5.4 4.36A9 9 0 0 0 20.5 15" />
              </svg>
            </button>
          </div>
        </div>
        <div className="student-alert-panel-body">
          {alerts.length === 0 ? (
            <div className="student-alert-empty">새로운 알림이 없습니다.</div>
          ) : (
            alerts.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`student-alert-item ${a.read ? 'read' : 'unread'}`}
                onClick={() => markAlertRead(a)}>
                <div className="student-alert-item-head">
                  <div className="student-alert-item-title">{a.title}</div>
                  <span className="student-alert-item-state">
                    {a.read ? '읽음' : '안읽음'}
                  </span>
                </div>
                <div className="student-alert-item-body">{a.body}</div>
                <div className="student-alert-item-time">{formatAlertTime(a.ts)}</div>
              </button>
            ))
          )}
        </div>
      </div>,
      document.body
    )
  }

  const refreshAiReportExists = useCallback(async () => {
    if (!appIds.length) {
      setAiReportExistsMap({})
      return
    }
    try {
      const { data, error } = await supabase
        .from('interview_ai_reports')
        .select('application_id')
        .in('application_id', appIds)
      if (error) throw error
      const exists = {}
      ;(data || []).forEach((row) => {
        if (row?.application_id) exists[row.application_id] = true
      })
      setAiReportExistsMap(exists)
      if (aiReportOpen && aiReportRow?.app?.id && !exists[aiReportRow.app.id]) {
        setAiReport(null)
        setAiReportError('해당 면접자의 AI 리포트가 삭제되었습니다.')
      }
    } catch (e) {
      console.error('ai report existence load failed:', e)
      setAiReportExistsMap({})
    }
  }, [appIds, aiReportOpen, aiReportRow])

  async function handleJoinMeeting(row, schedule) {
    if (!row?.app?.id || !schedule) return
    if ((row.setting?.interview_mode || 'online') !== 'online') return

    let meetingLink = schedule.meeting_link || ''
    let roomCode = parseInviteCodeFromLink(meetingLink)

    if (!roomCode) {
      try {
        const roomRes = await fetch(`${MEET_SERVER_URL}/create-room`)
        if (!roomRes.ok) throw new Error('회의실 생성 실패')
        const roomJson = await roomRes.json()
        roomCode = String(roomJson?.roomId || '').trim()
        if (!roomCode) throw new Error('초대코드 생성 실패')

        meetingLink = `${window.location.origin}/meet-record?room=${encodeURIComponent(roomCode)}&program=${encodeURIComponent(row.app.program_id || '')}`
        if (schedule.id) {
          const { error } = await supabase
            .from('interview_schedules')
            .update({ meeting_link: meetingLink })
            .eq('id', schedule.id)
          if (error) throw error
        }
        setScheduleMap((prev) => ({
          ...prev,
          [row.app.id]: { ...(prev[row.app.id] || schedule), meeting_link: meetingLink },
        }))
      } catch (e) {
        console.error('meeting link restore failed:', e)
        showToast('화상 링크를 복구하지 못했습니다. 잠시 후 다시 시도해주세요.')
        return
      }
    }

    navigate(`/meet-record?room=${encodeURIComponent(roomCode)}&program=${encodeURIComponent(row.app.program_id || '')}`)
  }

  async function openAiReport(row) {
    const appId = row?.app?.id
    if (!appId) return
    setAiReportOpen(true)
    setAiReportRow(row)
    setAiReportLoading(true)
    setAiReportError('')
    setAiReport(null)
    try {
      const { data, error } = await supabase
        .from('interview_ai_reports')
        .select('id, created_at, duration_minutes, summary_raw, report_json, transcripts, behavior_logs, screenshots, interviewee_name, interviewer_name')
        .eq('application_id', appId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      setAiReport(data || null)
    } catch (e) {
      setAiReportError(e.message || '조회 실패')
    } finally {
      setAiReportLoading(false)
    }
  }

  const canEditByProgram = useMemo(() => {
    const out = {}
    Object.values(programMap).forEach((p) => {
      const deadline = p?.pre_recruit_end_date
      if (!deadline) {
        out[p.id] = true
        return
      }
      const now = new Date()
      const d = parseDateSafe(deadline)
      out[p.id] = d ? now <= d : true
    })
    return out
  }, [programMap])

  useEffect(() => {
    if (!user?.id) return
    loadAll()
  }, [user?.id, myName, myBirth, myPhone])

  // 기업/운영진이 평가(stage)를 바꾸면 면접자 화면에서도 바로 반영되도록 applications 변경을 구독합니다.
  useEffect(() => {
    if (!user?.id) return
    if (!rows.length) return
    const appIds = rows.map(r => r.app.id).filter(Boolean)
    if (!appIds.length) return

    const channel = supabase
      .channel(`student-app-updates-${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'applications' }, (payload) => {
        const next = payload.new
        if (!next?.id) return
        if (!appIds.includes(next.id)) return
        // stage(평가 상태) 등 즉시 반영
        setRows((prev) => prev.map((r) => (
          r.app.id === next.id
            ? { ...r, app: { ...r.app, stage: next.stage, form_data: next.form_data } }
            : r
        )))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [rowAppIdsKey, user?.id])

  useEffect(() => {
    refreshAiReportExists()
  }, [refreshAiReportExists])

  useEffect(() => {
    if (!appIds.length) return
    const channel = supabase
      .channel(`student-ai-report-updates-${user?.id || 'anonymous'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interview_ai_reports' }, (payload) => {
        const next = payload.new
        const prev = payload.old
        const touchedId = next?.application_id || prev?.application_id
        if (!touchedId || !appIds.includes(touchedId)) return
        refreshAiReportExists()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [appIds, refreshAiReportExists, user?.id])

  async function loadAll() {
    if (!myName || !myBirth || !myPhone) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data: apps, error } = await supabase
        .from('applications')
        .select('*')
        .eq('application_type', 'interview')
        .eq('name', myName)
        .order('created_at', { ascending: false })
      if (error) throw error

      const matchedApps = (apps || []).filter((a) => {
        const fd = a.form_data || {}
        const appBirth = normalizeBirth(fd.birth || a.birth || '')
        const appPhone = normalizePhone(fd.phone || a.phone || '')
        return appBirth === myBirth && appPhone === myPhone
      })

      if (matchedApps.length === 0) {
        setRows([])
        setProgramMap({})
        setScheduleMap({})
        return
      }

      const programIds = [...new Set(matchedApps.map(a => a.program_id).filter(Boolean))]
      const companyNames = [...new Set(matchedApps.map(a => a.form_data?.company_name).filter(Boolean))]
      const appIds = matchedApps.map(a => a.id)

      const [{ data: programs }, { data: settings }, { data: schedules }, { data: teams }] = await Promise.all([
        supabase.from('programs').select('*').in('id', programIds),
        supabase.from('interview_settings').select('*').in('program_id', programIds).eq('status', 'submitted'),
        supabase.from('interview_schedules').select('*').in('application_id', appIds).neq('status', 'cancelled'),
        supabase.from('program_teams').select('id,name,program_id').in('program_id', programIds),
      ])

      const pMap = {}
      ;(programs || []).forEach((p) => { pMap[p.id] = p })

      const sMap = {}
      ;(schedules || []).forEach((s) => { sMap[s.application_id] = s })
      const teamNameById = new Map((teams || []).map(t => [String(t.id), t.name]))

      const resultRows = matchedApps.map((app) => {
        const companyName = app.form_data?.company_name || '미분류'
        const setting = (settings || []).find(
          st => st.program_id === app.program_id && normalizeCompany((st.company_name || teamNameById.get(String(st.program_teams_id)) || '')) === normalizeCompany(companyName),
        )
        return {
          app,
          companyName,
          setting,
          program: pMap[app.program_id] || null,
        }
      })

      setRows(resultRows)
      setProgramMap(pMap)
      setScheduleMap(sMap)

      const nextSlotState = {}
      const nextSelectedDateMap = {}
      resultRows.forEach((row) => {
        const now = new Date()
        const y = now.getFullYear()
        const m = now.getMonth()
        nextSlotState[row.app.id] = {
          viewYear: y,
          viewMonth: m,
          slots: buildSlots(row, sMap[row.app.id], schedules || []),
        }
        if (sMap[row.app.id]?.scheduled_date) {
          nextSelectedDateMap[row.app.id] = sMap[row.app.id].scheduled_date
        }
      })
      setSlotLoadMap(nextSlotState)
      setSelectedDateMap(nextSelectedDateMap)
      setSelectedSlotMap({})
      setEditModeMap({})

      if (brand && companyNames.length === 0) {
        console.info('브랜드 기반 공지만 노출:', brand)
      }
    } catch (e) {
      console.error('면접자 대시보드 로드 실패:', e)
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  function buildSlots(row, mySchedule, allSchedules) {
    const settingSlots = row.setting?.available_slots || []
    const groupMax = Number(row.setting?.interview_type === 'group' ? row.setting?.group_max_count || 0 : 1)
    const capacity = groupMax > 0 ? groupMax : 1

    const normalized = []
    settingSlots.forEach((daySlot) => {
      const date = daySlot?.date
      const tss = daySlot?.timeSlots || daySlot?.time_slots || []
      tss.forEach((ts) => {
        if (!date || !ts?.start || !ts?.end) return
        const bookedCount = (allSchedules || []).filter((s) => (
          s.program_id === row.app.program_id &&
          normalizeCompany(s.company_name) === normalizeCompany(row.companyName) &&
          s.scheduled_date === date &&
          s.scheduled_start_time === ts.start &&
          s.status !== 'cancelled'
        )).length

        normalized.push({
          date,
          start: ts.start,
          end: ts.end,
          bookedCount,
          capacity,
        })
      })
    })

    return normalized.sort((a, b) => (
      a.date === b.date ? a.start.localeCompare(b.start) : a.date.localeCompare(b.date)
    ))
  }

  async function onLoadSlots(row, monthDelta) {
    setSlotLoadMap((prev) => {
      const cur = prev[row.app.id] || { viewYear: new Date().getFullYear(), viewMonth: new Date().getMonth(), slots: [] }
      let y = cur.viewYear
      let m = cur.viewMonth + monthDelta
      if (m < 0) { m = 11; y -= 1 }
      if (m > 11) { m = 0; y += 1 }
      return { ...prev, [row.app.id]: { ...cur, viewYear: y, viewMonth: m } }
    })

    const { data: schedules } = await supabase
      .from('interview_schedules')
      .select('*')
      .eq('program_id', row.app.program_id)
      .eq('company_name', row.companyName)
      .neq('status', 'cancelled')

    setSlotLoadMap((prev) => {
      const cur = prev[row.app.id] || { viewYear: new Date().getFullYear(), viewMonth: new Date().getMonth(), slots: [] }
      return {
        ...prev,
        [row.app.id]: {
          ...cur,
          slots: buildSlots(row, scheduleMap[row.app.id], schedules || []),
  },
}

    })
  }

  function onPickDate(appId, date) {
    setSelectedDateMap(prev => ({ ...prev, [appId]: date }))
    setSelectedSlotMap(prev => {
      const cur = prev[appId]
      if (!cur) return prev
      if (cur.date === date) return prev
      return { ...prev, [appId]: null }
    })
  }

  function onPickSlot(appId, slot) {
    if (!slot) return
    const capacity = Number(slot.capacity || 1)
    const bookedCount = Number(slot.bookedCount || 0)
    if (capacity > 0 && bookedCount >= capacity) return
    setSelectedSlotMap(prev => ({ ...prev, [appId]: slot }))
  }

  function onToggleEdit(appId, on) {
    setEditModeMap(prev => ({ ...prev, [appId]: on }))
    if (!on) {
      setSelectedSlotMap(prev => ({ ...prev, [appId]: null }))
    }
  }

  async function onReserve(row, slot) {
    if (!slot) return

    const canEdit = canEditByProgram[row.app.program_id] ?? true
    if (!canEdit) {
      showToast('면접자 일정 제출 마감일이 지나 수정할 수 없습니다.')
      return
    }

    setSubmittingId(row.app.id)
    try {
      const { data: latest } = await supabase
        .from('interview_schedules')
        .select('id,application_id,status,meeting_link')
        .eq('program_id', row.app.program_id)
        .eq('company_name', row.companyName)
        .eq('scheduled_date', slot.date)
        .eq('scheduled_start_time', slot.start)
        .neq('status', 'cancelled')

      const capacity = Number(slot.capacity || 1)
      const othersCount = (latest || []).filter(s => s.application_id !== row.app.id).length
      if (othersCount >= capacity) {
        showToast('이미 마감된 시간입니다. 다른 시간을 선택해주세요.')
        await loadAll()
        return
      }

      const { data: existingMine } = await supabase
        .from('interview_schedules')
        .select('*')
        .eq('application_id', row.app.id)
        .maybeSingle()

      const isGroupInterview = row.setting?.interview_type === 'group' || capacity > 1
      const sharedSlotMeetingLink = (latest || [])
        .filter((s) => s.application_id !== row.app.id)
        .map((s) => String(s?.meeting_link || '').trim())
        .find(Boolean) || null

      let meetingLink = null
      if (isGroupInterview) {
        // 그룹면접은 같은 기업+같은 시간 슬롯의 기존 링크를 우선 재사용
        meetingLink = sharedSlotMeetingLink || existingMine?.meeting_link || null
      } else {
        meetingLink = existingMine?.meeting_link || null
      }

      if ((row.setting?.interview_mode || 'online') === 'online' && !meetingLink) {
        const roomRes = await fetch(`${MEET_SERVER_URL}/create-room`)
        if (!roomRes.ok) {
          throw new Error('면접 화상 회의실 생성에 실패했습니다. 잠시 후 다시 시도해주세요.')
        }
        const roomJson = await roomRes.json()
        const roomId = String(roomJson?.roomId || '').trim()
        if (!roomId) {
          throw new Error('면접 화상 초대코드를 생성하지 못했습니다. 잠시 후 다시 시도해주세요.')
        }
        meetingLink = `${window.location.origin}/meet-record?room=${encodeURIComponent(roomId)}`
      }

      const payload = {
        program_id: row.app.program_id,
        interview_setting_id: row.setting?.id || null,
        application_id: row.app.id,
        brand: row.program?.brand || brand || null,
        company_name: row.companyName,
        scheduled_date: slot.date,
        scheduled_start_time: slot.start,
        scheduled_end_time: slot.end,
        interview_mode: row.setting?.interview_mode || 'online',
        meeting_link: (row.setting?.interview_mode || 'online') === 'online' ? meetingLink : null,
        face_address: row.setting?.interview_mode === 'face' ? (row.setting?.face_address || null) : null,
        status: 'scheduled',
      }

      if (existingMine?.id) {
        const { error: updateErr } = await supabase
          .from('interview_schedules')
          .update(payload)
          .eq('id', existingMine.id)
        if (updateErr) throw updateErr
      } else {
        const { error: insertErr } = await supabase.from('interview_schedules').insert(payload)
        if (insertErr) throw insertErr
      }

      const mergedFormData = {
        ...(row.app.form_data || {}),
        booked_date: slot.date,
        booked_time: slot.start,
      }
      const { error: appUpdateErr } = await supabase
        .from('applications')
        .update({ form_data: mergedFormData })
        .eq('id', row.app.id)
      if (appUpdateErr) throw appUpdateErr

      showToast(existingMine?.id ? '면접 일정이 수정되었습니다.' : '면접 일정이 예약되었습니다.')
      setEditModeMap(prev => ({ ...prev, [row.app.id]: false }))
      await loadAll()
      return true
    } catch (e) {
      console.error('예약 실패:', e)
      showToast(`예약 실패: ${e.message}`)
      return false
    } finally {
      setSubmittingId('')
    }
  }

  const menuItems = [
    { id: 'home', label: '홈', icon: LineIcon.Home },
    { id: 'interviews', label: '내 면접', icon: LineIcon.Calendar },
    { id: 'notices', label: '공지사항', icon: LineIcon.Megaphone },
    { id: 'alerts', label: '알림', icon: LineIcon.Bell },
  ]

  const programCards = useMemo(() => {
    const grouped = {}
    rows.forEach((r) => {
      const pid = r.app.program_id
      if (!grouped[pid]) {
        grouped[pid] = {
          programId: pid,
          program: r.program,
          total: 0,
          booked: 0,
        }
      }
      grouped[pid].total += 1
      if (scheduleMap[r.app.id]) grouped[pid].booked += 1
    })
    return Object.values(grouped)
  }, [rows, scheduleMap])

  useEffect(() => {
    if (!programCards.length) {
      setSelectedProgramId('')
      setSearchParams({}, { replace: true })
      return
    }
    if (selectedProgramId && programCards.some((pc) => pc.programId === selectedProgramId)) return
    setSelectedProgramId('')
    setSearchParams({}, { replace: true })
  }, [programCards, selectedProgramId, setSearchParams])

  useEffect(() => {
    const programParam = String(searchParams.get('program') || '').trim()
    if (!programParam) return
    if (programParam === selectedProgramId) return
    if (programCards.some((pc) => pc.programId === programParam)) {
      setSelectedProgramId(programParam)
      setMenu('interviews')
    }
  }, [programCards, searchParams, selectedProgramId])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [menu, selectedProgramId])

  useEffect(() => {
    setCourseDropdownOpen(false)
  }, [selectedProgramId])

  useEffect(() => {
    if (!profileDropdownOpen) return
    const onDown = (e) => {
      const panel = profileDropdownRef.current
      const trigger = profileTriggerRef.current
      const t = e.target
      if (panel && panel.contains(t)) return
      if (trigger && trigger.contains(t)) return
      setProfileDropdownOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [profileDropdownOpen])

  useEffect(() => {
    if (!mobileMenuOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [mobileMenuOpen])

  useEffect(() => {
    const onResize = () => setIsTabletMobile(window.innerWidth <= 1024)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const activeRows = useMemo(() => {
    if (!selectedProgramId) return []
    return rows.filter((r) => r.app.program_id === selectedProgramId)
  }, [rows, selectedProgramId])

  const activeProgram = useMemo(() => (
    selectedProgramId ? programMap[selectedProgramId] || null : null
  ), [programMap, selectedProgramId])
  const submissionDeadlineText = useMemo(() => (
    activeProgram?.pre_recruit_end_date ? formatDateTimeNoSeconds(activeProgram.pre_recruit_end_date) : ''
  ), [activeProgram?.pre_recruit_end_date])
  const alertReadKey = useMemo(() => (
    selectedProgramId ? `student_alert_read_${user?.id || 'anon'}_${selectedProgramId}` : ''
  ), [selectedProgramId, user?.id])
  const alertReadEntryKey = useMemo(() => (
    selectedProgramId ? `student_alert_read_entries_${user?.id || 'anon'}_${selectedProgramId}` : ''
  ), [selectedProgramId, user?.id])

  useEffect(() => {
    if (!rows.length) return
    const myProgramSet = new Set(rows.map(r => r.app.program_id))
    const channel = supabase
      .channel(`student-schedules-${user?.id || 'anon'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interview_schedules' }, (payload) => {
        const targetProgram = payload.new?.program_id || payload.old?.program_id
        if (targetProgram && myProgramSet.has(targetProgram)) {
          loadAll()
        }
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [rows, user?.id])

  useEffect(() => {
    if (!selectedProgramId) {
      setShowAlertPanel(false)
      setAlerts([])
      setAlertUnread(0)
      return
    }
    loadAlerts()
  }, [selectedProgramId, activeRows])

  useEffect(() => {
    if (!selectedProgramId) return
    const appIds = activeRows.map((r) => r.app.id).filter(Boolean)
    if (appIds.length === 0) return
    const channel = supabase
      .channel(`student-alert-${selectedProgramId}-${user?.id || 'anon'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interview_schedules' }, (payload) => {
        const targetAppId = payload.new?.application_id || payload.old?.application_id
        const targetProgram = payload.new?.program_id || payload.old?.program_id
        if (targetProgram === selectedProgramId && appIds.includes(targetAppId)) {
          loadAlerts()
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'programs' }, (payload) => {
        const p = payload.new || payload.old
        if (p?.id === selectedProgramId) {
          loadAlerts()
        }
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedProgramId, user?.id, activeRows, alertReadKey])

  useEffect(() => {
    if (!selectedProgramId) return
    const timer = setInterval(() => {
      loadAlerts()
    }, 60 * 1000)
    return () => clearInterval(timer)
  }, [selectedProgramId, activeRows])

  useEffect(() => {
    if (!showAlertPanel) return
    const updatePanelPosition = () => {
      const el = (isTabletMobile ? topAlertBtnRef.current : alertBtnRef.current) || alertBtnRef.current || topAlertBtnRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const sidebarRect = sidebarRef.current?.getBoundingClientRect()
      const panelWidth = Math.min(380, Math.max(280, window.innerWidth - 24))
      const panelHeight = 520
      const viewportPadding = 12
      const maxLeft = Math.max(viewportPadding, window.innerWidth - panelWidth - viewportPadding)
      const sidebarRight = sidebarRect?.right ?? rect.right
      const desktopLeft = Math.min(sidebarRight + 14, maxLeft)
      const topCandidate = rect.top - 4
      const clampedTop = Math.min(
        Math.max(72, topCandidate),
        Math.max(72, window.innerHeight - panelHeight - viewportPadding)
      )
      setAlertPanelPos({
        top: isTabletMobile ? Math.min(Math.max(rect.bottom + 10, 72), Math.max(72, window.innerHeight - panelHeight - viewportPadding)) : clampedTop,
        left: isTabletMobile ? Math.min(Math.max(viewportPadding, rect.right - panelWidth), maxLeft) : desktopLeft,
      })
    }
    updatePanelPosition()
    window.addEventListener('resize', updatePanelPosition)
    window.addEventListener('scroll', updatePanelPosition, true)
    return () => {
      window.removeEventListener('resize', updatePanelPosition)
      window.removeEventListener('scroll', updatePanelPosition, true)
    }
  }, [showAlertPanel, isTabletMobile])

  useEffect(() => {
    if (!showAlertPanel) return
    const onDown = (e) => {
      const sidebarBtn = alertBtnRef.current
      const topBtn = topAlertBtnRef.current
      const panel = alertPanelRef.current
      const t = e.target
      if (panel && panel.contains(t)) return
      if (sidebarBtn && sidebarBtn.contains(t)) return
      if (topBtn && topBtn.contains(t)) return
      setShowAlertPanel(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [showAlertPanel])

  const unreadAlertBadge = alertUnread > 0 ? (alertUnread > 99 ? '99+' : String(alertUnread)) : ''

  useEffect(() => {
    if (!courseDropdownOpen) return
    const onDown = (e) => {
      const panel = courseDropdownRef.current
      const trigger = courseTriggerRef.current
      const t = e.target
      if (panel && panel.contains(t)) return
      if (trigger && trigger.contains(t)) return
      setCourseDropdownOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [courseDropdownOpen])

  function getReadEntries() {
    try {
      const raw = localStorage.getItem(alertReadEntryKey)
      const arr = raw ? JSON.parse(raw) : []
      return new Set(Array.isArray(arr) ? arr : [])
    } catch {
      return new Set()
    }
  }

  function saveReadEntries(entries) {
    if (!alertReadEntryKey) return
    localStorage.setItem(alertReadEntryKey, JSON.stringify([...entries]))
  }

  function markAlertRead(alert) {
    if (!alert || alert.read) return
    const entries = getReadEntries()
    entries.add(alert.entryKey)
    saveReadEntries(entries)
    setAlerts((prev) => prev.map((a) => a.entryKey === alert.entryKey ? { ...a, read: true } : a))
    setAlertUnread((prev) => Math.max(0, prev - 1))
  }

  function formatAlertTime(ts) {
    if (!ts) return '-'
    const d = new Date(ts)
    if (Number.isNaN(d.getTime())) return '-'
    return d.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  async function loadAlerts() {
    if (!selectedProgramId) return
    const appIds = activeRows.map((r) => r.app.id).filter(Boolean)
    if (appIds.length === 0) {
      setAlerts([])
      setAlertUnread(0)
      return
    }
    try {
      const [{ data: schedules }, { data: apps }, { data: program }] = await Promise.all([
        supabase
          .from('interview_schedules')
          .select('id, created_at, updated_at, scheduled_date, scheduled_start_time, scheduled_end_time, application_id, status')
          .eq('program_id', selectedProgramId)
          .in('application_id', appIds)
          .neq('status', 'cancelled')
          .order('updated_at', { ascending: false })
          .limit(80),
        supabase
          .from('applications')
          .select('id, name, form_data')
          .in('id', appIds),
        supabase
          .from('programs')
          .select('id, pre_recruit_end_date')
          .eq('id', selectedProgramId)
          .maybeSingle(),
      ])
      const appMetaById = new Map((apps || []).map((a) => [a.id, {
        name: a.name || '면접자',
        companyName: a.form_data?.company_name || '기업',
      }]))
      const readEntries = getReadEntries()

      const scheduleAlerts = (schedules || []).map((s) => {
        const isChanged = (s.updated_at || '') !== (s.created_at || '')
        const appMeta = appMetaById.get(s.application_id) || { name: '면접자', companyName: '기업' }
        const ts = s.updated_at || s.created_at
        const entryKey = `schedule:${s.id}:${ts}`
        return {
          id: `schedule:${s.id}`,
          ts,
          entryKey,
          title: isChanged ? '면접 일정 변경' : '면접 일정 등록',
          body: `${appMeta.companyName} · ${appMeta.name} · ${s.scheduled_date} ${s.scheduled_start_time || ''}${s.scheduled_end_time ? ` ~ ${s.scheduled_end_time}` : ''}`,
          read: readEntries.has(entryKey),
        }
      })

      const deadline = program?.pre_recruit_end_date ? new Date(program.pre_recruit_end_date) : null
      const deadlineAlerts = []
      if (deadline && !Number.isNaN(deadline.getTime()) && new Date().getTime() >= deadline.getTime()) {
        const ts = deadline.toISOString()
        const entryKey = `deadline:${selectedProgramId}:${ts}`
        deadlineAlerts.push({
          id: `deadline:${selectedProgramId}`,
          ts,
          entryKey,
          title: '일정 제출 마감',
          body: '운영진이 설정한 일정 제출 마감 시간이 지났습니다.',
          read: readEntries.has(entryKey),
        })
      }

      const mapped = [...deadlineAlerts, ...scheduleAlerts]
        .sort((a, b) => new Date(b.ts || 0).getTime() - new Date(a.ts || 0).getTime())
        .slice(0, 120)
      setAlerts(mapped)
      const unread = mapped.filter((a) => !a.read).length
      setAlertUnread(unread)
    } catch (e) {
      console.error('student alerts load failed:', e)
    }
  }

  if (loading) {
    return <div className="loading">불러오는 중...</div>
  }

  return (
    <div className={`${selectedProgramId ? 'student-dashboard-page' : 'workspace-selector-page'}`} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="topbar student-topbar">
        {selectedProgramId && (
          <button
            type="button"
            className="mobile-menu-btn"
            aria-label="메뉴 열기"
            onClick={() => setMobileMenuOpen((v) => !v)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </svg>
          </button>
        )}
        <div className="logo student-logo">
          <BrandLogo />
          <div className="student-logo-divider">|</div>
          <span className="student-logo-text">면접시스템</span>
        </div>

        {selectedProgramId && (
          <div className="topbar-center-group student-course-switcher" ref={courseDropdownRef}>
            <button
              ref={courseTriggerRef}
              type="button"
              className={`student-course-trigger ${courseDropdownOpen ? 'open' : ''}`}
              onClick={() => setCourseDropdownOpen((v) => !v)}>
              <span className="student-course-label">교육과정</span>
              <span className="student-course-trigger-text">
                {activeProgram?.title || (programCards.length > 0 ? '참여중인 교육과정 선택' : '참여중인 교육과정이 없습니다')}
              </span>
              <span className="student-course-trigger-chevron" aria-hidden="true" />
            </button>
            {courseDropdownOpen && (
              <div className="student-course-dropdown-panel">
                <div className="student-course-dropdown-head">
                  <div>
                    <div className="student-course-dropdown-title">참여중인 교육과정</div>
                    <div className="student-course-dropdown-subtitle">선택 시 면접 대시보드로 이동합니다.</div>
                  </div>
                  <div className="student-course-dropdown-count">{programCards.length}개</div>
                </div>
                <div className="student-course-dropdown-list">
                  {programCards.length === 0 ? (
                    <div className="student-course-dropdown-empty">참여중인 교육과정이 없습니다.</div>
                  ) : programCards.map((pc) => {
                    const active = pc.programId === selectedProgramId
                    return (
                      <button
                        key={pc.programId}
                        type="button"
                        className={`student-course-dropdown-item ${active ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedProgramId(pc.programId)
                          setMenu('home')
                          setShowAlertPanel(false)
                          setMobileMenuOpen(false)
                          setCourseDropdownOpen(false)
                          setSearchParams({ program: pc.programId }, { replace: true })
                        }}>
                        <div className="student-course-dropdown-item-main">
                          <div className="student-course-dropdown-item-title">{pc.program?.title || '-'}</div>
                          <div className="student-course-dropdown-item-meta">예약 완료 {pc.booked}/{pc.total}</div>
                        </div>
                        {active && <span className="student-course-dropdown-item-check">선택됨</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="topbar-spacer" />

        {selectedProgramId && (
          <button
            ref={topAlertBtnRef}
            type="button"
            className="mobile-top-alert"
            aria-label="알림"
            onClick={() => {
              setShowAlertPanel((v) => !v)
            }}>
            <LineIcon.Bell />
            {alertUnread > 0 && (
              <span style={{
                position: 'absolute',
                top: -5,
                right: -5,
                minWidth: 16,
                height: 16,
                borderRadius: 999,
                background: '#DC2626',
                color: '#fff',
                fontSize: 10,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
                lineHeight: 1,
              }}>
                {alertUnread > 99 ? '99+' : alertUnread}
              </span>
            )}
          </button>
        )}
        {selectedProgramId && (
          <>
            <div className="student-profile-wrap" ref={profileDropdownRef}>
              <button
                ref={profileTriggerRef}
                type="button"
                className={`student-profile-trigger ${profileDropdownOpen ? 'open' : ''}`}
                onClick={() => setProfileDropdownOpen((v) => !v)}>
                {profileInfo.avatarUrl ? (
                  <img className="student-profile-avatar" src={profileInfo.avatarUrl} alt="" />
                ) : (
                  <span className="student-profile-avatar" aria-hidden="true">
                    {profileInfo.name.trim().charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="student-profile-trigger-name">{profileInfo.name}</span>
                <span className="student-profile-trigger-chevron" aria-hidden="true" />
              </button>

              {profileDropdownOpen && (
                <div className="student-profile-panel">
                  <div className="student-profile-panel-head">
                    {profileInfo.avatarUrl ? (
                      <img className="student-profile-panel-avatar" src={profileInfo.avatarUrl} alt="" />
                    ) : (
                      <div className="student-profile-panel-avatar">{profileInfo.name.trim().charAt(0).toUpperCase()}</div>
                    )}
                    <div className="student-profile-panel-copy">
                      <div className="student-profile-panel-name">{profileInfo.name}</div>
                      <div className="student-profile-panel-role">내 프로필</div>
                    </div>
                  </div>
                  <div className="student-profile-panel-grid">
                    <div className="student-profile-panel-row">
                      <span>전화번호</span>
                      <strong>{profileInfo.phone}</strong>
                    </div>
                    <div className="student-profile-panel-row">
                      <span>이메일</span>
                      <strong>{profileInfo.email}</strong>
                    </div>
                    <div className="student-profile-panel-row">
                      <span>생년월일</span>
                      <strong>{profileInfo.birth}</strong>
                    </div>
                    <div className="student-profile-panel-row">
                      <span>만 나이</span>
                      <strong>{profileInfo.age}</strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="student-profile-edit-btn"
                    onClick={() => {
                      if (profileBrand === 'insideout') {
                        window.location.href = 'https://insideout.or.kr/mypage'
                      }
                    }}>
                    가입정보 변경하기
                  </button>
                </div>
              )}
            </div>
            <div className="topbar-divider" />
          </>
        )}
        <button className="btn-ghost-sm topbar-logout" onClick={async () => {
          await signOut()
          if (brand) {
            window.location.href = `/login?brand=${brand}`
            return
          }
          navigate('/login')
        }}>로그아웃</button>
      </header>

      {!selectedProgramId ? (
        <main className="workspace-selector-shell">
          <div className="workspace-selector-hero">
            <div className="workspace-selector-kicker">INTERVIEW SYSTEM</div>
            <div className="workspace-selector-title">참여중인 교육과정</div>
            <div className="workspace-selector-subtitle">교육과정을 선택해 대시보드로 이동하세요.</div>
          </div>

          <div className="workspace-selector-card">
            {programCards.length === 0 ? (
              <div className="workspace-selector-empty">참여중인 교육과정이 없습니다. 운영진에게 지원 정보 확인을 요청해주세요.</div>
            ) : (
              <div className="workspace-selector-list">
                {programCards.map((pc) => (
                  <button
                    key={`${pc.programId}-${pc.total}-${pc.booked}`}
                    type="button"
                    className="workspace-selector-item"
                    onClick={() => {
                      setSelectedProgramId(pc.programId)
                      setMenu('interviews')
                      setSearchParams({ program: pc.programId }, { replace: true })
                    }}>
                    <div className="workspace-selector-item-main">
                      <div className="workspace-selector-item-label">교육과정</div>
                      <div className="workspace-selector-item-title">{pc.program?.title || '-'}</div>
                      <div className="workspace-selector-item-meta">
                        <span className="workspace-selector-chip gray">예약 완료 {pc.booked}/{pc.total}</span>
                        <span className="workspace-selector-chip blue">대시보드 이동</span>
                      </div>
                    </div>
                    <svg className="workspace-selector-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        </main>
      ) : (
        <div className="layout-body dashboard-shell">
          <aside ref={sidebarRef} className={`sidebar student-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <div className="nav-section student-nav-section" style={{ position: 'relative' }}>
              {menuItems.map(item => (
                <button
                  key={item.id}
                  ref={item.id === 'alerts' ? alertBtnRef : undefined}
                  className={`nav-item student-nav-item ${item.id === 'home' ? 'student-nav-home' : 'student-nav-link'} ${menu === item.id ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  onClick={() => {
                    if (item.id === 'alerts') {
                      setShowAlertPanel((v) => !v)
                    } else if (item.id === 'interviews') {
                      setMenu('home')
                      requestAnimationFrame(() => {
                        document.getElementById('student-interview-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      })
                    } else if (item.id === 'home') {
                      setMenu('home')
                      requestAnimationFrame(() => {
                        document.getElementById('student-home-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      })
                    } else {
                      setMenu(item.id)
                    }
                    setMobileMenuOpen(false)
                  }}>
                  <span className="nav-icon"><item.icon /></span>
                  {item.label}
                  {item.id === 'alerts' && unreadAlertBadge ? (
                    <span
                      className="student-menu-badge"
                      style={{
                        minWidth: 18,
                        height: 18,
                        padding: '0 5px',
                        borderRadius: 999,
                        background: '#EF4444',
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 600,
                        lineHeight: 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginLeft: 'auto',
                        flexShrink: 0,
                      }}>
                      {unreadAlertBadge}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
            <div className="mobile-sidebar-logout">
              <button className="btn-ghost-sm" onClick={async () => {
                await signOut()
                if (brand) {
                  window.location.href = `/login?brand=${brand}`
                  return
                }
                navigate('/login')
              }}>
                로그아웃
              </button>
            </div>
          </aside>
          {renderAlertPanel()}
          {mobileMenuOpen && (
            <button
              type="button"
              className="mobile-sidebar-overlay"
              aria-label="메뉴 닫기"
              onClick={() => setMobileMenuOpen(false)}
            />
          )}

          <main className="main-content student-main-content">
            <div className="student-dashboard-wrap">
              {menu === 'notices' ? (
                <StudentNotices brand={brand || activeProgram?.brand || null} />
              ) : (
                <div id="student-home-top" className="student-home-stack">
                  <MyInterviews
                    rows={activeRows}
                    scheduleMap={scheduleMap}
                    canEditByProgram={canEditByProgram}
                    editModeMap={editModeMap}
                    onToggleEdit={onToggleEdit}
                    submissionDeadlineText={submissionDeadlineText}
                    deadlineRaw={activeProgram?.pre_recruit_end_date || null}
                    onJoinMeeting={handleJoinMeeting}
                    onCopyValue={copyWithToast}
                    onOpenSchedule={(row) => {
                      setScheduleModalRow(row)
                      setScheduleModalOpen(true)
                      const appId = row?.app?.id
                      if (!appId) return
                      setSelectedDateMap((prev) => {
                        if (prev?.[appId]) return prev
                        const firstDate = slotLoadMap?.[appId]?.slots?.[0]?.date
                        return firstDate ? { ...prev, [appId]: firstDate } : prev
                      })
                    }}
                  />

                  <StudentNotices
                    brand={brand || activeProgram?.brand || null}
                    compact
                    onMore={() => setMenu('notices')}
                  />
                </div>
              )}
            </div>
          </main>
        </div>
      )}

      <ScheduleSelectModal
        open={scheduleModalOpen}
        row={scheduleModalRow}
        schedule={scheduleModalRow ? scheduleMap[scheduleModalRow.app.id] : null}
        slotState={scheduleModalRow ? slotLoadMap[scheduleModalRow.app.id] : null}
        selectedDate={scheduleModalRow ? selectedDateMap[scheduleModalRow.app.id] : ''}
        selectedSlot={scheduleModalRow ? selectedSlotMap[scheduleModalRow.app.id] : null}
        onClose={() => {
          const appId = scheduleModalRow?.app?.id
          setScheduleModalOpen(false)
          setScheduleModalRow(null)
          if (appId) onToggleEdit(appId, false)
        }}
        onPickDate={onPickDate}
        onPickSlot={onPickSlot}
        onChangeMonth={onLoadSlots}
        onSubmit={async (row, slot) => {
          const ok = await onReserve(row, slot)
          if (ok) {
            setScheduleModalOpen(false)
            setScheduleModalRow(null)
          }
        }}
        submitting={!!(scheduleModalRow && submittingId === scheduleModalRow.app.id)}
        canEdit={!!(scheduleModalRow && (canEditByProgram[scheduleModalRow.app.program_id] ?? true))}
        isBooked={!!(scheduleModalRow && scheduleMap[scheduleModalRow.app.id])}
        isEditMode={!!(scheduleModalRow && editModeMap[scheduleModalRow.app.id])}
      />

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--gray-900)', color: '#fff', padding: '10px 20px', borderRadius: 999, fontSize: 14, zIndex: 9999 }}>
          {toast}
        </div>
      )}
    </div>
  )
}
