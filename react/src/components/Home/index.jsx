import React from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="menu-screen" data-easytag="id1-react/src/components/Home/index.jsx">
      <div className="menu-card">
        <h1 className="title">8-БИТНЫЕ ГОНКИ</h1>
        <p className="subtitle">Топ-даун аркада в ретро стиле</p>
        <button className="btn btn-primary" onClick={() => navigate('/game')}>
          Начать игру
        </button>
        <div className="help">
          <h2>Управление</h2>
          <ul>
            <li>Вперёд/Тормоз: Стрелки Вверх/Вниз или W/S</li>
            <li>Поворот: Стрелки Влево/Вправо или A/D</li>
            <li>Пауза/Продолжить: Пробел или Esc</li>
          </ul>
          <p className="note">Рекорды сохраняются только в рамках текущей сессии браузера.</p>
        </div>
      </div>
    </div>
  );
};

export default Home;
