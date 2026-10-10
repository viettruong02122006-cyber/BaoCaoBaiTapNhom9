import { useEffect, useState } from "react";
import {
  Routes,
  Route,
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import "./index.css";

type Movie = {
  id: number;
  title: string;
  genre: string;
  duration: number;
  rating: number;
  poster: string;
  description: string;
  status: "now" | "coming";
};

type Ticket = {
  code: string;
  movie: string;
  movieId: number;
  time: string;
  seats: string[];
  total: number;
  date: string;
  cinema?: string;
  cinemaAddress?: string;
  combos?: ComboSelection[];
  comboTotal?: number;
  paymentMethod?: string;
  paymentStatus?: "pending" | "paid" | "cancelled";
  userEmail?: string;
}

type User = {
  name: string;
  email: string;
  password: string;
};

type Combo = {
  id: number;
  name: string;
  price: number;
  description: string;
};

type ComboSelection = {
  id: number;
  name: string;
  price: number;
  quantity: number;
};;

function isTicket(value: unknown): value is Ticket {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.code === "string" &&
    typeof item.movie === "string" &&
    typeof item.movieId === "number" &&
    typeof item.time === "string" &&
    Array.isArray(item.seats) &&
    item.seats.every((seat) => typeof seat === "string") &&
    typeof item.total === "number" &&
    typeof item.date === "string"
  );
}

function getBookedSeatsForShow(
  movieId: number,
  cinema: string,
  date: string,
  time: string
): string[] {
  return getTickets()
    .filter(
      (ticket) =>
        ticket.movieId === movieId &&
        ticket.cinema === cinema &&
        ticket.date === date &&
        ticket.time === time &&
        ticket.paymentStatus === "paid"
    )
    .flatMap((ticket) => ticket.seats);
}

function isSeatBookedForShow(
  seat: string,
  movieId: number,
  cinema: string,
  date: string,
  time: string
): boolean {
  return getBookedSeatsForShow(movieId, cinema, date, time).includes(seat);
}

function getTickets(): Ticket[] {
  const saved = localStorage.getItem("tickets");

  if (!saved) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isTicket);
  } catch (error) {
    console.log("Không thể đọc dữ liệu vé:", error);
    return [];
  }
}

function getUsers(): User[] {
  const saved = localStorage.getItem("users");

  if (!saved) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is User => {
      if (typeof item !== "object" || item === null) {
        return false;
      }

      const user = item as Record<string, unknown>;
      return (
        typeof user.name === "string" &&
        typeof user.email === "string" &&
        typeof user.password === "string"
      );
    });
  } catch (error) {
    console.log("Không thể đọc danh sách tài khoản:", error);
    return [];
  }
}

function getCurrentUser(): User | null {
  const saved = localStorage.getItem("currentUser");

  if (!saved) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(saved);

    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }

    const user = parsed as Record<string, unknown>;

    if (
      typeof user.name !== "string" ||
      typeof user.email !== "string" ||
      typeof user.password !== "string"
    ) {
      return null;
    }

    return {
      name: user.name,
      email: user.email,
      password: user.password,
    };
  } catch (error) {
    console.log("Không thể đọc tài khoản hiện tại:", error);
    return null;
  }
}

function saveUsers(users: User[]): void {
  localStorage.setItem("users", JSON.stringify(users));
}

function setCurrentUser(user: User): void {
  localStorage.setItem("currentUser", JSON.stringify(user));
  window.dispatchEvent(new Event("auth-change"));
}

function logoutUser(): void {
  localStorage.removeItem("currentUser");
  window.dispatchEvent(new Event("auth-change"));
}


type Room = { id:number; name:string; rows:number; seatsPerRow:number; vipRows:string[] };
type PriceConfig = { normal:number; vip:number; before17:number; evening:number; lateNight:number };
const defaultRooms: Room[] = [
  {id:1,name:"Phòng 01",rows:6,seatsPerRow:10,vipRows:["E","F"]},
  {id:2,name:"Phòng 02",rows:6,seatsPerRow:10,vipRows:["E","F"]},
  {id:3,name:"Phòng VIP",rows:5,seatsPerRow:8,vipRows:["D","E"]},
];
const defaultPriceConfig: PriceConfig = {normal:70000,vip:90000,before17:.9,evening:1,lateNight:.85};
function getRooms(): Room[] { const x=localStorage.getItem("cinemaRooms"); if(!x)return defaultRooms; try{const v:unknown=JSON.parse(x); return Array.isArray(v)?v.filter((i):i is Room=>typeof i==="object"&&i!==null&&typeof (i as Record<string,unknown>).id==="number"&&typeof (i as Record<string,unknown>).name==="string"&&typeof (i as Record<string,unknown>).rows==="number"&&typeof (i as Record<string,unknown>).seatsPerRow==="number"&&Array.isArray((i as Record<string,unknown>).vipRows)):defaultRooms}catch(e){console.log("Lỗi đọc phòng:",e);return defaultRooms;} }
function saveRooms(v:Room[]):void{localStorage.setItem("cinemaRooms",JSON.stringify(v));}
function getPriceConfig():PriceConfig{const x=localStorage.getItem("priceConfig");if(!x)return defaultPriceConfig;try{const v:unknown=JSON.parse(x);if(typeof v!=="object"||v===null)return defaultPriceConfig;const r=v as Record<string,unknown>;return typeof r.normal==="number"&&typeof r.vip==="number"&&typeof r.before17==="number"&&typeof r.evening==="number"&&typeof r.lateNight==="number"?r as PriceConfig:defaultPriceConfig}catch(e){console.log("Lỗi đọc giá:",e);return defaultPriceConfig;}}
function savePriceConfig(v:PriceConfig):void{localStorage.setItem("priceConfig",JSON.stringify(v));}
function canCancelTicket(ticket: Ticket): boolean {
  return ticket.paymentStatus === "paid";
}

function cancelTicket(code: string): void {
  const tickets: Ticket[] = getTickets();

  const updatedTickets: Ticket[] = tickets.map(
    (ticket: Ticket): Ticket => {
      if (ticket.code === code) {
        return {
          ...ticket,
          paymentStatus: "cancelled",
        };
      }

      return ticket;
    }
  );

  localStorage.setItem("tickets", JSON.stringify(updatedTickets));

  console.log("Đã hủy vé:", code);

  window.dispatchEvent(new Event("tickets-change"));
}

type Cinema = {
  id: number;
  name: string;
  address: string;
};

const cinemas: Cinema[] = [
  { id: 1, name: "CINEMA Nguyễn Trãi", address: "123 Nguyễn Trãi, Hà Nội" },
  { id: 2, name: "CINEMA Cầu Giấy", address: "456 Cầu Giấy, Hà Nội" },
  { id: 3, name: "CINEMA Mỹ Đình", address: "789 Mỹ Đình, Hà Nội" },
];

type ShowDate = {
  id: number;
  label: string;
  value: string;
};

const showDates: ShowDate[] = [
  { id: 1, label: "Hôm nay", value: "16/09/2026" },
  { id: 2, label: "Ngày mai", value: "17/09/2026" },
  { id: 3, label: "Thứ 6", value: "18/09/2026" },
  { id: 4, label: "Thứ 7", value: "19/09/2026" },
  { id: 5, label: "Chủ nhật", value: "20/09/2026" },
];

const combos: Combo[] = [
  { id: 1, name: "Bắp rang", price: 45000, description: "Bắp rang caramel thơm ngon" },
  { id: 2, name: "Nước ngọt", price: 30000, description: "Nước ngọt size M" },
  { id: 3, name: "Combo Bắp + Nước", price: 65000, description: "1 bắp rang + 1 nước ngọt" },
  { id: 4, name: "Combo Couple", price: 95000, description: "2 bắp rang + 2 nước ngọt" },
];

const movies: Movie[] = [
  {
    id: 1,
    title: "Avengers: End Game",
    genre: "Hành động",
    duration: 181,
    rating: 8.8,
    poster:
      "https://images.unsplash.com/photo-1531259683007-016a7b628fc3?auto=format&fit=crop&w=600&q=80",
    description:
      "Các siêu anh hùng tập hợp để chống lại mối đe dọa lớn nhất.",
    status: "now",
  },
  {
    id: 2,
    title: "Avatar: The Way of Water",
    genre: "Khoa học viễn tưởng",
    duration: 192,
    rating: 8.6,
    poster:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=80",
    description:
      "Hành trình khám phá thế giới Pandora đầy kỳ thú.",
    status: "now",
  },
  {
    id: 3,
    title: "Spider-Man",
    genre: "Hành động",
    duration: 148,
    rating: 8.4,
    poster:
      "https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=600&q=80",
    description:
      "Người Nhện đối mặt với những thử thách mới.",
    status: "now",
  },
  {
    id: 4,
    title: "Superman",
    genre: "Hành động",
    duration: 130,
    rating: 8.2,
    poster:
      "https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?auto=format&fit=crop&w=600&q=80",
    description:
      "Một người hùng trở lại để bảo vệ thành phố.",
    status: "coming",
  },
];

function Header() {
  const [currentUser, setCurrentUserState] = useState<User | null>(getCurrentUser());

  useEffect(() => {
    const syncUser = () => setCurrentUserState(getCurrentUser());
    window.addEventListener("auth-change", syncUser);
    return () => window.removeEventListener("auth-change", syncUser);
  }, []);

  function handleLogout() {
    logoutUser();
    console.log("Đã đăng xuất:", currentUser?.email);
  }

  return (
    <header className="header">
      <div className="container navbar">
        <Link to="/" className="logo">🎬 CINEMA</Link>

        <nav>
          <Link to="/">Trang chủ</Link>
          <Link to="/movies">Phim</Link>
          <Link to="/history">Vé của tôi</Link>
          {currentUser ? (
            <>
              <Link to="/account">👤 {currentUser.name}</Link>
              <button type="button" className="nav-logout" onClick={handleLogout}>Đăng xuất</button>
            </>
          ) : (
            <Link to="/login">Đăng nhập</Link>
          )}
          <Link to="/admin">Quản trị</Link>
        </nav>
      </div>
    </header>
  );
}


type MovieReactionValue = "like" | "dislike" | null;

type MovieReactionData = {
  likes: number;
  dislikes: number;
  users: Record<string, MovieReactionValue>;
};

function getMovieReactionData(movieId: number): MovieReactionData {
  const key = `movie-reactions-${movieId}`;
  const saved = localStorage.getItem(key);

  if (!saved) {
    return {
      likes: 0,
      dislikes: 0,
      users: {},
    };
  }

  try {
    const data: unknown = JSON.parse(saved);

    if (
      typeof data === "object" &&
      data !== null &&
      "likes" in data &&
      "dislikes" in data &&
      "users" in data
    ) {
      const item = data as {
        likes: unknown;
        dislikes: unknown;
        users: unknown;
      };

      if (
        typeof item.likes === "number" &&
        typeof item.dislikes === "number" &&
        typeof item.users === "object" &&
        item.users !== null
      ) {
        return {
          likes: item.likes,
          dislikes: item.dislikes,
          users: item.users as Record<string, MovieReactionValue>,
        };
      }
    }
  } catch (error: unknown) {
    console.log("Không đọc được lượt thích:", error);
  }

  return {
    likes: 0,
    dislikes: 0,
    users: {},
  };
}

function MovieReaction({ movieId }: { movieId: number }) {
  const [reaction, setReaction] = useState<MovieReactionValue>(null);
  const [likes, setLikes] = useState<number>(0);
  const [dislikes, setDislikes] = useState<number>(0);

  useEffect(() => {
    const data = getMovieReactionData(movieId);
    const currentUser = getCurrentUser();
    const userKey = currentUser?.email ?? "guest";

    setLikes(data.likes);
    setDislikes(data.dislikes);
    setReaction(data.users[userKey] ?? null);
  }, [movieId]);

  const handleReaction = (value: MovieReactionValue): void => {
    const data = getMovieReactionData(movieId);
    const currentUser = getCurrentUser();
    const userKey = currentUser?.email ?? "guest";
    const oldReaction: MovieReactionValue = data.users[userKey] ?? null;

    if (oldReaction === value) {
      data.users[userKey] = null;

      if (value === "like") {
        data.likes = Math.max(0, data.likes - 1);
      } else if (value === "dislike") {
        data.dislikes = Math.max(0, data.dislikes - 1);
      }

      setReaction(null);
    } else {
      if (oldReaction === "like") {
        data.likes = Math.max(0, data.likes - 1);
      }

      if (oldReaction === "dislike") {
        data.dislikes = Math.max(0, data.dislikes - 1);
      }

      data.users[userKey] = value;

      if (value === "like") {
        data.likes += 1;
      }

      if (value === "dislike") {
        data.dislikes += 1;
      }

      setReaction(value);
    }

    setLikes(data.likes);
    setDislikes(data.dislikes);

    localStorage.setItem(
      `movie-reactions-${movieId}`,
      JSON.stringify(data)
    );

    console.log("Phản hồi phim:", {
      movieId,
      user: userKey,
      reaction: data.users[userKey],
      likes: data.likes,
      dislikes: data.dislikes,
    });
  };

  return (
    <div className="movie-reactions">
      <span className="movie-rating">
        ⭐ {movies.find((movie) => movie.id === movieId)?.rating ?? 0}/10
      </span>

      <button
        type="button"
        className={`reaction-btn ${reaction === "like" ? "active-like" : ""}`}
        onClick={() => handleReaction("like")}
        aria-label="Thích phim"
      >
        👍<span>{likes}</span>
      </button>

      <button
        type="button"
        className={`reaction-btn ${reaction === "dislike" ? "active-dislike" : ""}`}
        onClick={() => handleReaction("dislike")}
        aria-label="Không thích phim"
      >
        👎<span>{dislikes}</span>
      </button>
    </div>
  );
}

function Home() {
  return (
    <>
      <section className="hero">

        <div className="container hero-content">

          <span className="tag">
            WEBSITE ĐẶT VÉ XEM PHIM
          </span>

          <h1>
            Trải nghiệm điện ảnh
            <br />
            theo cách của bạn
          </h1>

          <p>
            Chọn bộ phim, rạp, suất chiếu và ghế ngồi
            yêu thích chỉ trong vài bước.
          </p>

          <Link to="/movies" className="btn">
            ĐẶT VÉ NGAY
          </Link>

        </div>

      </section>

      <section className="container section">

        <div className="title">
          <div>
            <span>NOW SHOWING</span>
            <h2>Phim đang chiếu</h2>
          </div>

          <Link to="/movies">
            Xem tất cả →
          </Link>
        </div>

        <div className="movie-grid">

          {movies.map((movie) => (
            <div className="movie-card" key={movie.id}>

              <img
                src={movie.poster}
                alt={movie.title}
              />

              <div className="movie-content">

                <h3>{movie.title}</h3>

                <p>
                  {movie.genre} • {movie.duration} phút
                </p>

                <MovieReaction movieId={movie.id} />

                <Link
                  to={`/movie/${movie.id}`}
                  className="btn small"
                >
                  XEM CHI TIẾT
                </Link>

              </div>

            </div>
          ))}

        </div>

      </section>
    </>
  );
}

function Movies() {
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("Tất cả");
  const [status, setStatus] = useState("Tất cả");

  const genres = [
    "Tất cả",
    ...Array.from(new Set(movies.map((movie) => movie.genre))),
  ];

  const filteredMovies = movies.filter((movie) => {
    const keyword = search.trim().toLowerCase();

    const matchesSearch =
      keyword === "" ||
      movie.title.toLowerCase().includes(keyword) ||
      movie.description.toLowerCase().includes(keyword);

    const matchesGenre = genre === "Tất cả" || movie.genre === genre;

    const matchesStatus =
      status === "Tất cả" ||
      (status === "Đang chiếu" && movie.status === "now") ||
      (status === "Sắp chiếu" && movie.status === "coming");

    return matchesSearch && matchesGenre && matchesStatus;
  });

  console.log("Giai đoạn 7 - từ khóa:", search);
  console.log("Giai đoạn 7 - thể loại:", genre);
  console.log("Giai đoạn 7 - trạng thái:", status);
  console.log("Giai đoạn 7 - số phim tìm thấy:", filteredMovies.length);

  return (
    <main className="container section">
      <span className="tag-red">MOVIES</span>
      <h1>Danh sách phim</h1>

      <div className="movie-filters">
        <input
          className="movie-search"
          type="text"
          placeholder="🔎 Tìm tên phim..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select
          className="movie-filter-select"
          value={genre}
          onChange={(event) => setGenre(event.target.value)}
        >
          {genres.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          className="movie-filter-select"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="Tất cả">Tất cả trạng thái</option>
          <option value="Đang chiếu">Đang chiếu</option>
          <option value="Sắp chiếu">Sắp chiếu</option>
        </select>

        <button
          type="button"
          className="btn small"
          onClick={() => {
            setSearch("");
            setGenre("Tất cả");
            setStatus("Tất cả");
          }}
        >
          XÓA LỌC
        </button>
      </div>

      <p className="filter-result">
        Tìm thấy <strong>{filteredMovies.length}</strong> phim
      </p>

      {filteredMovies.length > 0 ? (
        <div className="movie-grid">
          {filteredMovies.map((movie) => (
            <div className="movie-card" key={movie.id}>
              <img src={movie.poster} alt={movie.title} />

              <div className="movie-content">
                <div className={`movie-status ${movie.status}`}>
                  {movie.status === "now" ? "ĐANG CHIẾU" : "SẮP CHIẾU"}
                </div>

                <h3>{movie.title}</h3>

                <p>
                  {movie.genre} • {movie.duration} phút
                </p>

                <MovieReaction movieId={movie.id} />

                <Link to={`/movie/${movie.id}`} className="btn small">
                  XEM CHI TIẾT
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h3>Không tìm thấy phim</h3>
          <p>Hãy thử từ khóa, thể loại hoặc trạng thái khác.</p>
        </div>
      )}
    </main>
  );
}

function MovieDetail() {

  const { id } = useParams();

  const navigate = useNavigate();

  const movie = movies.find(
    (item) => item.id === Number(id)
  );

  if (!movie) {
    return (
      <main className="container section">
        <h1>Không tìm thấy phim</h1>
      </main>
    );
  }

  const times = [
    "10:00",
    "13:30",
    "16:00",
    "19:30",
    "21:30",
  ];

  return (
    <main className="container section">

      <div className="detail">

        <img
          src={movie.poster}
          alt={movie.title}
        />

        <div>

          <span className="tag-red">
            PHIM ĐANG CHIẾU
          </span>

          <h1>{movie.title}</h1>

          <MovieReaction movieId={movie.id} />

          <p>
            Thể loại: {movie.genre}
          </p>

          <p>
            Thời lượng: {movie.duration} phút
          </p>

          <p className="description">
            {movie.description}
          </p>

          <h3>Chọn suất chiếu</h3>

          <div className="times">

            {times.map((time) => (

              <button
                key={time}
                onClick={() =>
                  navigate(
                    `/booking/${movie.id}?time=${time}`
                  )
                }
              >
                {time}
              </button>

            ))}

          </div>

        </div>

      </div>

    </main>
  );
}

type Seat = {
  id: string;
  type: "normal" | "vip";
  status: "available" | "booked" | "selected";
};

function createSeats(): Seat[][] {

  const rows = ["A", "B", "C", "D", "E", "F"];

  return rows.map((row) =>

    Array.from({ length: 10 }, (_, index) => {

      const id = `${row}${index + 1}`;

      const booked = [
        "A4",
        "A5",
        "B7",
        "C3",
        "D5",
        "E8",
      ].includes(id);

      return {
        id,
        type:
          row === "E" || row === "F"
            ? "vip"
            : "normal",
        status: booked
          ? "booked"
          : "available",
      };

    })

  );
}

function Booking() {
  const { id } = useParams();
  const movie = movies.find((item) => item.id === Number(id));
  const [seats, setSeats] = useState<Seat[][]>(createSeats());
  const [timeLeft, setTimeLeft] = useState(300);
  const [time, setTime] = useState("19:30");
  const [selectedCinema, setSelectedCinema] = useState<Cinema>(cinemas[0]);
  const [selectedRoom, setSelectedRoom] = useState<Room>(getRooms()[0]);
  const [selectedDate, setSelectedDate] = useState<ShowDate>(showDates[0]);
  const [comboSelections, setComboSelections] = useState<ComboSelection[]>([]);
  const [bookedSeats, setBookedSeats] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((value) => {
        if (value <= 1) {
          clearInterval(timer);
          setSeats((old) =>
            old.map((row) =>
              row.map((seat) =>
                seat.status === "selected"
                  ? { ...seat, status: "available" }
                  : seat
              )
            )
          );
          console.log("Hết thời gian giữ ghế, các ghế đang chọn được trả lại.");
          return 300;
        }
        return value - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!movie || !selectedCinema || !selectedDate || !time) {
      setBookedSeats([]);
      return;
    }

    const booked = getBookedSeatsForShow(
      movie.id,
      selectedCinema.name,
      selectedDate.value,
      time
    );

    setBookedSeats(booked);

    setSeats((current) =>
      current.map((row) =>
        row.map((seat) =>
          booked.includes(seat.id)
            ? { ...seat, status: "booked" }
            : seat.status === "booked"
              ? { ...seat, status: "available" }
              : seat
        )
      )
    );

    console.log("Giai đoạn 9 - ghế đã đặt:", booked);
  }, [movie, selectedCinema, selectedDate, time]);

  useEffect(() => {
    const room = getRooms().find((item) => item.id === selectedRoom.id) ?? getRooms()[0];
    if (!room) return;
    setSeats(Array.from({ length: room.rows }, (_, ri) => {
      const row = String.fromCharCode(65 + ri);
      return Array.from({ length: room.seatsPerRow }, (_, si) => {
        const id = `${row}${si + 1}`;
        return { id, type: room.vipRows.includes(row) ? "vip" : "normal", status: bookedSeats.includes(id) ? "booked" : "available" };
      });
    }));
    console.log("Phòng chiếu đang dùng:", room);
  }, [selectedRoom.id, bookedSeats]);

  if (!movie) {
    return <h1>Không tìm thấy phim</h1>;
  }

  const selectedMovie: Movie = movie;

  function selectSeat(rowIndex: number, seatIndex: number) {
    const seat = seats[rowIndex]?.[seatIndex];

    if (!seat || seat.status === "booked") {
      console.log("Ghế đã được đặt, không thể chọn:", seat?.id);
      return;
    }

    console.log("Ghế được chọn/bỏ chọn:", seat.id);

    setSeats((old) =>
      old.map((row, r) =>
        row.map((currentSeat, s) => {
          if (r !== rowIndex || s !== seatIndex || currentSeat.status === "booked") {
            return currentSeat;
          }

          return {
            ...currentSeat,
            status:
              currentSeat.status === "selected"
                ? "available"
                : "selected",
          };
        })
      )
    );
  }

  const selectedSeats = seats
    .flat()
    .filter((seat) => seat.status === "selected");

  const ticketTotal = selectedSeats.reduce(
    (sum, seat) => sum + (seat.type === "vip" ? 100000 : 70000),
    0
  );

  const comboTotal = comboSelections.reduce(
    (sum, combo) => sum + combo.price * combo.quantity,
    0
  );

  const total = ticketTotal + comboTotal;

  function changeCombo(combo: Combo, amount: number) {
    setComboSelections((current) => {
      const existing = current.find((item) => item.id === combo.id);
      const nextQuantity = (existing?.quantity ?? 0) + amount;

      if (nextQuantity <= 0) {
        return current.filter((item) => item.id !== combo.id);
      }

      const next: ComboSelection = {
        id: combo.id,
        name: combo.name,
        price: combo.price,
        quantity: nextQuantity,
      };

      if (!existing) {
        console.log("Thêm combo:", next);
        return [...current, next];
      }

      console.log("Cập nhật combo:", next);
      return current.map((item) => item.id === combo.id ? next : item);
    });
  }

  function booking() {
    const currentUser = getCurrentUser();

    if (!currentUser) {
      alert("Vui lòng đăng nhập trước khi đặt vé!");
      navigate("/login");
      return;
    }

    if (selectedSeats.length === 0) {
      alert("Vui lòng chọn ít nhất một ghế!");
      return;
    }

    const latestBookedSeats = getBookedSeatsForShow(
      selectedMovie.id,
      selectedCinema.name,
      selectedDate.value,
      time
    );

    const conflicts = selectedSeats
      .map((seat) => seat.id)
      .filter((seatId) => latestBookedSeats.includes(seatId));

    if (conflicts.length > 0) {
      alert(
        `Ghế vừa được người khác đặt: ${conflicts.join(", ")}. Vui lòng chọn ghế khác.`
      );
      console.log("Phát hiện ghế bị trùng trước khi thanh toán:", conflicts);

      setBookedSeats(latestBookedSeats);
      setSeats((current) =>
        current.map((row) =>
          row.map((seat) =>
            latestBookedSeats.includes(seat.id)
              ? { ...seat, status: "booked" }
              : seat
          )
        )
      );
      return;
    }

    const code = "CB" + Date.now().toString().slice(-8);

    const ticket: Ticket = {
      code,
      movie: selectedMovie.title,
      movieId: selectedMovie.id,
      cinema: selectedCinema.name,
      cinemaAddress: selectedCinema.address,
      date: selectedDate.value,
      time,
      seats: selectedSeats.map((seat) => seat.id),
      total,
      combos: comboSelections,
      comboTotal,
      userEmail: getCurrentUser()?.email,
    };

    localStorage.setItem("pendingTicket", JSON.stringify(ticket));

    console.log("Tạo đơn hàng chờ thanh toán:", ticket);
    navigate("/payment");
  }

  return (
    <main className="container section">
      <div className="booking-header">
        <div>
          <span className="tag-red">ĐẶT VÉ XEM PHIM</span>
          <h1>{selectedMovie.title}</h1>
          <p>
            📍 {selectedCinema.name} • {selectedCinema.address}
          </p>
        </div>

        <div className="timer">
          ⏱ {Math.floor(timeLeft / 60)}:
          {String(timeLeft % 60).padStart(2, "0")}
        </div>
      </div>

      <div className="booking">
        <div className="seat-area">
          <h3>1. Chọn rạp</h3>
          <div className="showtimes">
            {cinemas.map((cinema) => (
              <button
                key={cinema.id}
                className={selectedCinema.id === cinema.id ? "active-time" : ""}
                onClick={() => {
                  setSelectedCinema(cinema);
                  console.log("Rạp được chọn:", cinema.name);
                }}
              >
                {cinema.name}
              </button>
            ))}
          </div>

          <p><b>Địa chỉ:</b> {selectedCinema.address}</p>

          <h3>2. Chọn phòng chiếu</h3>
          <div className="showtimes">
            {getRooms().map((room) => (
              <button
                type="button"
                key={room.id}
                className={selectedRoom.id === room.id ? "active-time" : ""}
                onClick={() => {
                  setSelectedRoom(room);
                  console.log("Phòng được chọn:", room);
                }}
              >
                {room.name}
              </button>
            ))}
          </div>

          <h3>3. Chọn ngày</h3>
          <div className="showtimes">
            {showDates.map((date) => (
              <button
                key={date.id}
                className={selectedDate.id === date.id ? "active-time" : ""}
                onClick={() => {
                  setSelectedDate(date);
                  console.log("Ngày được chọn:", date.value);
                }}
              >
                {date.label}<br />
                <small>{date.value}</small>
              </button>
            ))}
          </div>

          <h3>4. Chọn suất chiếu</h3>
          <div className="showtimes">
            {["10:00", "13:30", "16:00", "19:30", "21:30"].map((t) => (
              <button
                key={t}
                className={time === t ? "active-time" : ""}
                onClick={() => {
                  setTime(t);
                  console.log("Suất chiếu được chọn:", t);
                }}
              >
                {t}
              </button>
            ))}
          </div>

          <h3>5. Chọn ghế</h3>
          <div className="screen">MÀN HÌNH</div>

          <div className="seat-map">
            {seats.map((row, rowIndex) => (
              <div className="seat-row" key={rowIndex}>
                <span>{row[0].id[0]}</span>
                {row.map((seat, seatIndex) => (
                  <button
                    key={seat.id}
                    className={`seat ${seat.type} ${seat.status} ${bookedSeats.includes(seat.id) ? "booked-from-ticket" : ""}`}
                    onClick={() => selectSeat(rowIndex, seatIndex)}
                    disabled={seat.status === "booked" || bookedSeats.includes(seat.id)}
                  >
                    {seat.id.slice(1)}
                  </button>
                ))}
              </div>
            ))}
          </div>

          <h3>6. Chọn combo bắp nước</h3>
          <div className="combo-grid">
            {combos.map((combo) => {
              const selected = comboSelections.find((item) => item.id === combo.id);
              const quantity = selected?.quantity ?? 0;

              return (
                <div className="combo-card" key={combo.id}>
                  <div>
                    <h4>{combo.name}</h4>
                    <p>{combo.description}</p>
                    <strong>{combo.price.toLocaleString("vi-VN")} VNĐ</strong>
                  </div>
                  <div className="combo-actions">
                    <button type="button" onClick={() => changeCombo(combo, -1)} disabled={quantity === 0}>−</button>
                    <b>{quantity}</b>
                    <button type="button" onClick={() => changeCombo(combo, 1)}>+</button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="legend">
            <span><i className="free" /> Trống</span>
            <span><i className="choose" /> Đang chọn</span>
            <span><i className="used" /> Đã đặt</span>
            <span className="booked-seat-note">Ghế màu xám đã được đặt</span>
            <span><i className="vip" /> VIP</span>
          </div>
        </div>

        <aside className="booking-info">
          <h2>Thông tin đặt vé</h2>
          <p><b>Phim:</b> {selectedMovie.title}</p>
          <p><b>Rạp:</b> {selectedCinema.name}</p>
          <p><b>Ngày:</b> {selectedDate.value}</p>
          <p><b>Suất:</b> {time}</p>
          <p>
            <b>Ghế:</b>{" "}
            {selectedSeats.length
              ? selectedSeats.map((seat) => seat.id).join(", ")
              : "Chưa chọn"}
          </p>
          <hr />
          <p>
            Ghế thường: <b>70.000 VNĐ</b> / ghế
          </p>
          <p>
            Ghế VIP: <b>100.000 VNĐ</b> / ghế
          </p>
          <hr />
          <hr />
          <p>Tiền vé: <b>{ticketTotal.toLocaleString("vi-VN")} VNĐ</b></p>
          <p>Tiền combo: <b>{comboTotal.toLocaleString("vi-VN")} VNĐ</b></p>
          <h2 className="price">{total.toLocaleString("vi-VN")} VNĐ</h2>
          <button className="btn full" onClick={booking}>
            XÁC NHẬN ĐẶT VÉ
          </button>
        </aside>
      </div>
    </main>
  );
}

type PaymentMethod = {
  id: string;
  name: string;
  icon: string;
  description: string;
};

const paymentMethods: PaymentMethod[] = [
  {
    id: "bank",
    name: "Thẻ ngân hàng",
    icon: "💳",
    description: "Thanh toán mô phỏng bằng thẻ ngân hàng",
  },
  {
    id: "wallet",
    name: "Ví điện tử",
    icon: "📱",
    description: "Thanh toán mô phỏng bằng ví điện tử",
  },
  {
    id: "cash",
    name: "Thanh toán tại quầy",
    icon: "💵",
    description: "Giữ đơn và thanh toán tại quầy vé",
  },
];

function Payment() {
  const navigate = useNavigate();
  const [pendingTicket, setPendingTicket] = useState<Ticket | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>("bank");
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("pendingTicket");

    if (!saved) {
      return;
    }

    try {
      const parsed: unknown = JSON.parse(saved);
      if (isTicket(parsed)) {
        setPendingTicket(parsed);
        console.log("Đơn hàng chờ thanh toán:", parsed);
      }
    } catch (error) {
      console.log("Không thể đọc đơn hàng chờ thanh toán:", error);
    }
  }, []);

  function validatePendingSeats(): boolean {
    if (!pendingTicket) {
      return false;
    }

    const conflicts = pendingTicket.seats.filter((seat) =>
      isSeatBookedForShow(
        seat,
        pendingTicket.movieId,
        pendingTicket.cinema ?? "",
        pendingTicket.date,
        pendingTicket.time
      )
    );

    if (conflicts.length > 0) {
      alert(
        `Ghế vừa được người khác đặt: ${conflicts.join(", ")}. Đơn hàng sẽ được hủy để bạn chọn lại.`
      );
      console.log("Giai đoạn 9 - phát hiện xung đột tại bước thanh toán:", conflicts);
      localStorage.removeItem("pendingTicket");
      navigate(`/booking/${pendingTicket.movieId}`);
      return false;
    }

    return true;
  }

  function payNow() {
    if (!pendingTicket) {
      return;
    }

    if (!validatePendingSeats()) {
      return;
    }

    const method = paymentMethods.find((item) => item.id === selectedMethod);
    if (!method) {
      alert("Vui lòng chọn phương thức thanh toán!");
      return;
    }

    setIsPaying(true);
    console.log("Bắt đầu thanh toán:", {
      code: pendingTicket.code,
      method: method.name,
      total: pendingTicket.total,
    });

    window.setTimeout(() => {
      const paidTicket: Ticket = {
        ...pendingTicket,
        paymentMethod: method.name,
        paymentStatus: "paid",
      };

      const oldTickets = getTickets();
      localStorage.setItem("tickets", JSON.stringify([paidTicket, ...oldTickets]));
      localStorage.removeItem("pendingTicket");

      console.log("Thanh toán thành công:", paidTicket);
      navigate(`/ticket/${paidTicket.code}`);
    }, 900);
  }

  if (!pendingTicket) {
    return (
      <main className="container section">
        <div className="empty">
          <h2>Không có đơn hàng cần thanh toán</h2>
          <p>Vui lòng quay lại chọn phim và đặt vé.</p>
          <Link className="btn" to="/movies">
            XEM DANH SÁCH PHIM
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="container section">
      <span className="tag-red">THANH TOÁN</span>
      <h1>Xác nhận thanh toán</h1>

      <div className="payment-layout">
        <div className="payment-box">
          <h2>Thông tin đơn hàng</h2>
          <div className="payment-summary">
            <p><b>Phim:</b> {pendingTicket.movie}</p>
            <p><b>Rạp:</b> {pendingTicket.cinema ?? "Chưa cập nhật"}</p>
            <p><b>Ngày:</b> {pendingTicket.date}</p>
            <p><b>Suất:</b> {pendingTicket.time}</p>
            <p><b>Ghế:</b> {pendingTicket.seats.join(", ")}</p>
            <hr />
            <p><b>Tiền vé:</b> {(pendingTicket.total - (pendingTicket.comboTotal ?? 0)).toLocaleString("vi-VN")} VNĐ</p>
            <p><b>Tiền combo:</b> {(pendingTicket.comboTotal ?? 0).toLocaleString("vi-VN")} VNĐ</p>
            <h2 className="price">{pendingTicket.total.toLocaleString("vi-VN")} VNĐ</h2>
          </div>
        </div>

        <div className="payment-box">
          <h2>Phương thức thanh toán</h2>

          <div className="payment-methods">
            {paymentMethods.map((method) => (
              <button
                type="button"
                key={method.id}
                className={`payment-method ${selectedMethod === method.id ? "selected-payment" : ""}`}
                onClick={() => {
                  setSelectedMethod(method.id);
                  console.log("Phương thức thanh toán:", method.name);
                }}
              >
                <span className="payment-icon">{method.icon}</span>
                <span>
                  <b>{method.name}</b>
                  <small>{method.description}</small>
                </span>
              </button>
            ))}
          </div>

          <button className="btn full payment-btn" onClick={payNow} disabled={isPaying}>
            {isPaying ? "ĐANG XỬ LÝ..." : "💳 THANH TOÁN NGAY"}
          </button>

          <p className="payment-note">
            Đây là chức năng thanh toán mô phỏng phục vụ bài tập. Không nhập thông tin thẻ thật.
          </p>
        </div>
      </div>
    </main>
  );
}

function createQrPattern(value: string): boolean[][] {
  const size = 21;
  const matrix: boolean[][] = Array.from(
    { length: size },
    () => Array<boolean>(size).fill(false)
  );

  function addFinder(startRow: number, startCol: number) {
    for (let row = 0; row < 7; row += 1) {
      for (let col = 0; col < 7; col += 1) {
        const border = row === 0 || row === 6 || col === 0 || col === 6;
        const center = row >= 2 && row <= 4 && col >= 2 && col <= 4;
        matrix[startRow + row][startCol + col] = border || center;
      }
    }
  }

  addFinder(0, 0);
  addFinder(0, size - 7);
  addFinder(size - 7, 0);

  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const insideFinder =
        (row < 7 && col < 7) ||
        (row < 7 && col >= size - 7) ||
        (row >= size - 7 && col < 7);

      if (!insideFinder) {
        hash = (hash * 1664525 + 1013904223) >>> 0;
        matrix[row][col] = (hash & 1) === 1;
      }
    }
  }

  return matrix;
}

function TicketQr({ code }: { code: string }) {
  const matrix = createQrPattern(code);

  return (
    <div className="qr-wrapper">
      <div
        className="qr-code"
        aria-label={`Mã QR mô phỏng cho vé ${code}`}
        style={{
          gridTemplateColumns: `repeat(${matrix.length}, 1fr)`,
          gridTemplateRows: `repeat(${matrix.length}, 1fr)`,
        }}
      >
        {matrix.flatMap((row, rowIndex) =>
          row.map((filled, colIndex) => (
            <span
              key={`${rowIndex}-${colIndex}`}
              className={filled ? "qr-cell filled" : "qr-cell"}
            />
          ))
        )}
      </div>
      <small>MÃ VÉ: {code}</small>
    </div>
  );
}

function Ticket() {
  const { code } = useParams();
  const tickets: Ticket[] = getTickets();
  const ticket = tickets.find((item) => item.code === code);

  if (!ticket) {
    return (
      <main className="container section">
        <div className="empty">
          <h1>Không tìm thấy vé</h1>
          <Link className="btn" to="/history">XEM VÉ CỦA TÔI</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="container section">
      <div className="ticket-page">
        <div className="ticket-top">
          <div>
            <span className="success">✓ ĐẶT VÉ THÀNH CÔNG</span>
            <p className="ticket-code">Mã vé: <b>{ticket.code}</b></p>
          </div>
          <span className="paid-badge">
            {ticket.paymentStatus === "paid"
              ? "✓ ĐÃ THANH TOÁN"
              : ticket.paymentStatus === "cancelled"
                ? "✕ ĐÃ HỦY"
                : "CHỜ THANH TOÁN"}
          </span>
        </div>

        <div className="ticket-main">
          <div className="ticket-info">
            <div className="ticket-movie">
              <span className="tag-red">E-TICKET</span>
              <h1>{ticket.movie}</h1>
            </div>

            <div className="ticket-details">
              <div><span>🏢 Rạp</span><b>{ticket.cinema ?? "Chưa cập nhật"}</b></div>
              <div><span>📍 Địa chỉ</span><b>{ticket.cinemaAddress ?? "Chưa cập nhật"}</b></div>
              <div><span>📅 Ngày chiếu</span><b>{ticket.date}</b></div>
              <div><span>🕐 Suất chiếu</span><b>{ticket.time}</b></div>
              <div><span>💺 Ghế</span><b>{ticket.seats.join(", ")}</b></div>
              <div><span>💳 Thanh toán</span><b>{ticket.paymentMethod ?? "Chưa cập nhật"}</b></div>
            </div>

            {ticket.combos && ticket.combos.length > 0 && (
              <div className="ticket-combos">
                <h3>🍿 Combo đã chọn</h3>
                {ticket.combos.map((combo) => (
                  <div className="ticket-combo-row" key={combo.id}>
                    <span>{combo.name} × {combo.quantity}</span>
                    <b>{(combo.price * combo.quantity).toLocaleString("vi-VN")} VNĐ</b>
                  </div>
                ))}
              </div>
            )}

            <div className="ticket-total-box">
              <span>TỔNG THANH TOÁN</span>
              <strong>{ticket.total.toLocaleString("vi-VN")} VNĐ</strong>
            </div>
          </div>

          <div className="ticket-qr-area">
            <TicketQr code={ticket.code} />
            <p>Đưa mã QR này cho nhân viên tại rạp.</p>
            <small>QR mô phỏng phục vụ bài tập.</small>
          </div>
        </div>

        <div className="ticket-actions">
          <Link className="btn" to="/movies">🎬 TIẾP TỤC ĐẶT VÉ</Link>
          <Link className="btn ticket-secondary" to="/history">🎟️ VÉ CỦA TÔI</Link>
        </div>
      </div>
    </main>
  );
}

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleLogin() {
    const normalizedEmail = email.trim().toLowerCase();
    const users = getUsers();
    const user = users.find(
      (item) => item.email.toLowerCase() === normalizedEmail && item.password === password
    );

    if (!user) {
      alert("Email hoặc mật khẩu không đúng!");
      console.log("Đăng nhập thất bại:", normalizedEmail);
      return;
    }

    setCurrentUser(user);
    console.log("Đăng nhập thành công:", user.email);
    navigate("/");
  }

  return (
    <main className="container section auth-page">
      <div className="auth-box">
        <span className="tag-red">ACCOUNT</span>
        <h1>Đăng nhập</h1>
        <p>Đăng nhập để đặt vé và quản lý vé của bạn.</p>

        <input
          className="auth-input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <input
          className="auth-input"
          type="password"
          placeholder="Mật khẩu"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <button className="btn full" onClick={handleLogin}>ĐĂNG NHẬP</button>
        <p className="auth-switch">
          Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
        </p>
      </div>
    </main>
  );
}

function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function handleRegister() {
    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!trimmedName || !normalizedEmail || !password) {
      alert("Vui lòng nhập đầy đủ thông tin!");
      return;
    }

    if (password.length < 6) {
      alert("Mật khẩu phải có ít nhất 6 ký tự!");
      return;
    }

    if (password !== confirmPassword) {
      alert("Mật khẩu xác nhận không khớp!");
      return;
    }

    const users = getUsers();
    const exists = users.some((user) => user.email.toLowerCase() === normalizedEmail);

    if (exists) {
      alert("Email này đã được đăng ký!");
      return;
    }

    const newUser: User = {
      name: trimmedName,
      email: normalizedEmail,
      password,
    };

    saveUsers([...users, newUser]);
    setCurrentUser(newUser);
    console.log("Tạo tài khoản thành công:", newUser.email);
    navigate("/");
  }

  return (
    <main className="container section auth-page">
      <div className="auth-box">
        <span className="tag-red">CREATE ACCOUNT</span>
        <h1>Đăng ký</h1>
        <p>Tạo tài khoản để bắt đầu đặt vé xem phim.</p>

        <input className="auth-input" placeholder="Họ và tên" value={name} onChange={(event) => setName(event.target.value)} />
        <input className="auth-input" type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <input className="auth-input" type="password" placeholder="Mật khẩu (tối thiểu 6 ký tự)" value={password} onChange={(event) => setPassword(event.target.value)} />
        <input className="auth-input" type="password" placeholder="Nhập lại mật khẩu" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />

        <button className="btn full" onClick={handleRegister}>TẠO TÀI KHOẢN</button>
        <p className="auth-switch">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
      </div>
    </main>
  );
}

function Account() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const tickets = currentUser
    ? getTickets().filter((ticket) => ticket.userEmail === currentUser.email)
    : [];

  if (!currentUser) {
    return (
      <main className="container section">
        <div className="empty">
          <h2>Vui lòng đăng nhập</h2>
          <Link className="btn" to="/login">ĐĂNG NHẬP</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="container section">
      <span className="tag-red">MY ACCOUNT</span>
      <h1>Tài khoản của tôi</h1>

      <div className="account-layout">
        <div className="account-box">
          <div className="account-avatar">👤</div>
          <h2>{currentUser.name}</h2>
          <p>{currentUser.email}</p>
          <button
            className="btn"
            onClick={() => {
              logoutUser();
              console.log("Đăng xuất tài khoản:", currentUser.email);
              navigate("/");
            }}
          >
            ĐĂNG XUẤT
          </button>
        </div>

        <div className="account-box">
          <h2>Tổng quan</h2>
          <div className="account-stat">
            <span>🎟️ Vé đã đặt</span>
            <b>{tickets.length}</b>
          </div>
          <div className="account-stat">
            <span>💰 Tổng chi tiêu</span>
            <b>{tickets.reduce((sum, ticket) => sum + ticket.total, 0).toLocaleString("vi-VN")} VNĐ</b>
          </div>
          <Link className="btn" to="/history">XEM VÉ CỦA TÔI</Link>
        </div>
      </div>
    </main>
  );
}

function History() {

  const historyUser: User | null = getCurrentUser();
  const tickets: Ticket[] = historyUser
    ? getTickets().filter((ticket) => ticket.userEmail === historyUser.email)
    : [];

  return (

    <main className="container section">

      <span className="tag-red">
        MY TICKETS
      </span>

      <h1>
        Lịch sử đặt vé
      </h1>

      {!historyUser ? (
        <div className="empty">
          <h2>Bạn chưa đăng nhập</h2>
          <p>Đăng nhập để xem lịch sử đặt vé của tài khoản.</p>
          <Link className="btn" to="/login">ĐĂNG NHẬP</Link>
        </div>
      ) : tickets.length === 0 ? (

        <div className="empty">
          Bạn chưa đặt vé nào.
        </div>

      ) : (

        <div className="history">

          {tickets.map(
            (ticket) => (

              <div
                className="history-card"
                key={ticket.code}
              >

                <div>

                  <h3>
                    {ticket.movie}
                  </h3>

                  <p>
                    {ticket.date} •{" "}
                    {ticket.time}
                  </p>

                </div>

                <div>
                  Ghế:{" "}
                  {ticket.seats.join(
                    ", "
                  )}
                </div>

                <b>
                  {ticket.total.toLocaleString(
                    "vi-VN"
                  )}{" "}
                  VNĐ
                </b>

                <div className="history-actions">
                  <Link to={`/ticket/${ticket.code}`}>
                    Chi tiết
                  </Link>
                  {ticket.paymentStatus === "paid" && (
                    <button
                      type="button"
                      className="delete"
                      onClick={() => {
                        if (!canCancelTicket(ticket)) {
                          alert("Vé này không thể hủy.");
                          return;
                        }

                        const confirmed: boolean = window.confirm(
                          `Bạn có chắc muốn hủy vé ${ticket.code}?`
                        );

                        if (confirmed) {
                          cancelTicket(ticket.code);
                          alert("Hủy vé thành công!");
                          window.location.reload();
                        }
                      }}
                    >
                      Hủy vé
                    </button>
                  )}

                  {ticket.paymentStatus === "cancelled" && (
                    <span className="cancelled-badge">
                      Đã hủy
                    </span>
                  )}
                </div>

              </div>

            )
          )}

        </div>

      )}

    </main>

  );
}

function Admin() {
  type AdminShowtime = {
    id: number;
    movieId: number;
    movieTitle: string;
    cinema: string;
    date: string;
    time: string;
    price: number;
  };

  const [movieList, setMovieList] = useState<Movie[]>(() => {
    const saved = localStorage.getItem("adminMovies");

    if (!saved) {
      return movies;
    }

    try {
      const parsed: unknown = JSON.parse(saved);

      if (!Array.isArray(parsed)) {
        return movies;
      }

      const validMovies = parsed.filter((item): item is Movie => {
        if (typeof item !== "object" || item === null) {
          return false;
        }

        const movie = item as Record<string, unknown>;

        return (
          typeof movie.id === "number" &&
          typeof movie.title === "string" &&
          typeof movie.genre === "string" &&
          typeof movie.duration === "number" &&
          typeof movie.rating === "number" &&
          typeof movie.poster === "string" &&
          typeof movie.description === "string" &&
          (movie.status === "now" || movie.status === "coming")
        );
      });

      return validMovies.length > 0 ? validMovies : movies;
    } catch (error) {
      console.log("Không thể đọc danh sách phim Admin:", error);
      return movies;
    }
  });

  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [duration, setDuration] = useState("");
  const [rating, setRating] = useState("8");
  const [status, setStatus] = useState<"now" | "coming">("now");
  const [editingId, setEditingId] = useState<number | null>(null);

  const [showtimes, setShowtimes] = useState<AdminShowtime[]>(() => {
    const saved = localStorage.getItem("adminShowtimes");

    if (!saved) {
      return [];
    }

    try {
      const parsed: unknown = JSON.parse(saved);

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter((item): item is AdminShowtime => {
        if (typeof item !== "object" || item === null) {
          return false;
        }

        const showtime = item as Record<string, unknown>;

        return (
          typeof showtime.id === "number" &&
          typeof showtime.movieId === "number" &&
          typeof showtime.movieTitle === "string" &&
          typeof showtime.cinema === "string" &&
          typeof showtime.date === "string" &&
          typeof showtime.time === "string" &&
          typeof showtime.price === "number"
        );
      });
    } catch (error) {
      console.log("Không thể đọc suất chiếu:", error);
      return [];
    }
  });

  const [showMovieId, setShowMovieId] = useState<number>(movieList[0]?.id ?? 0);
  const [showCinema, setShowCinema] = useState(cinemas[0]?.name ?? "");
  const [showDate, setShowDate] = useState(showDates[0]?.value ?? "");
  const [showTime, setShowTime] = useState("19:00");
  const [showPrice, setShowPrice] = useState("75000");

  useEffect(() => {
    localStorage.setItem("adminMovies", JSON.stringify(movieList));
    console.log("Danh sách phim Admin:", movieList);
  }, [movieList]);

  useEffect(() => {
    localStorage.setItem("adminShowtimes", JSON.stringify(showtimes));
    console.log("Danh sách suất chiếu:", showtimes);
  }, [showtimes]);

  function resetMovieForm(): void {
    setTitle("");
    setGenre("");
    setDuration("");
    setRating("8");
    setStatus("now");
    setEditingId(null);
  }

  function addOrUpdateMovie(): void {
    if (!title.trim()) {
      alert("Vui lòng nhập tên phim!");
      return;
    }

    const movieData: Movie = {
      id: editingId ?? Date.now(),
      title: title.trim(),
      genre: genre.trim() || "Chưa phân loại",
      duration: Number(duration) || 120,
      rating: Number(rating) || 8,
      description: "Phim được quản lý bởi hệ thống CINEMA.",
      poster:
        "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80",
      status,
    };

    if (editingId === null) {
      setMovieList((current) => [...current, movieData]);
      console.log("Đã thêm phim:", movieData);
    } else {
      setMovieList((current) =>
        current.map((movie) =>
          movie.id === editingId ? movieData : movie
        )
      );
      console.log("Đã cập nhật phim:", movieData);
    }

    if (showMovieId === editingId) {
      setShowMovieId(movieData.id);
    }

    resetMovieForm();
  }

  function editMovie(movie: Movie): void {
    setEditingId(movie.id);
    setTitle(movie.title);
    setGenre(movie.genre);
    setDuration(String(movie.duration));
    setRating(String(movie.rating));
    setStatus(movie.status);
    window.scrollTo({ top: 0, behavior: "smooth" });
    console.log("Đang sửa phim:", movie);
  }

  function deleteMovie(id: number): void {
    const movie = movieList.find((item) => item.id === id);

    if (!movie) {
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa phim "${movie.title}"?`
    );

    if (!confirmed) {
      return;
    }

    setMovieList((current) =>
      current.filter((item) => item.id !== id)
    );

    setShowtimes((current) =>
      current.filter((showtime) => showtime.movieId !== id)
    );

    if (showMovieId === id) {
      const nextMovie = movieList.find((item) => item.id !== id);
      setShowMovieId(nextMovie?.id ?? 0);
    }

    if (editingId === id) {
      resetMovieForm();
    }

    console.log("Đã xóa phim:", movie.title);
  }

  function addShowtime(): void {
    const selectedMovie = movieList.find(
      (movie) => movie.id === showMovieId
    );

    if (!selectedMovie) {
      alert("Vui lòng chọn phim!");
      return;
    }

    if (!showCinema || !showDate || !showTime) {
      alert("Vui lòng nhập đầy đủ thông tin suất chiếu!");
      return;
    }

    const showtime: AdminShowtime = {
      id: Date.now(),
      movieId: selectedMovie.id,
      movieTitle: selectedMovie.title,
      cinema: showCinema,
      date: showDate,
      time: showTime,
      price: Number(showPrice) || 75000,
    };

    setShowtimes((current) => [...current, showtime]);
    console.log("Đã thêm suất chiếu:", showtime);
  }

  function deleteShowtime(id: number): void {
    setShowtimes((current) =>
      current.filter((showtime) => showtime.id !== id)
    );
    console.log("Đã xóa suất chiếu:", id);
  }

  const tickets = getTickets();
  const paidTickets = tickets.filter(
    (ticket) => ticket.paymentStatus === "paid"
  );
  const totalRevenue = paidTickets.reduce(
    (sum, ticket) => sum + ticket.total,
    0
  );
  const totalTickets = paidTickets.length;
  const totalSeats = paidTickets.reduce(
    (sum, ticket) => sum + ticket.seats.length,
    0
  );

  const movieRevenue = paidTickets.reduce<Record<string, number>>(
    (result, ticket) => {
      result[ticket.movie] = (result[ticket.movie] ?? 0) + ticket.total;
      return result;
    },
    {}
  );

  const topMovies = Object.entries(movieRevenue)
    .sort(([, revenueA], [, revenueB]) => revenueB - revenueA)
    .slice(0, 5);

  console.log("Thống kê Admin:", {
    totalTickets,
    totalSeats,
    totalRevenue,
    topMovies,
  });

  const [rooms, setRooms] = useState<Room[]>(getRooms());
  const [priceConfig, setPriceConfig] = useState<PriceConfig>(getPriceConfig());
  const [roomName, setRoomName] = useState("");
  const [roomRows, setRoomRows] = useState(6);
  const [roomSeats, setRoomSeats] = useState(10);
  const [vipRows, setVipRows] = useState("E,F");
  const money=(v:number):string=>`${v.toLocaleString("vi-VN")} VNĐ`;
  function addRoom():void{const name=roomName.trim();if(!name)return;const room:Room={id:rooms.length?Math.max(...rooms.map(r=>r.id))+1:1,name,rows:roomRows,seatsPerRow:roomSeats,vipRows:vipRows.split(",").map(x=>x.trim().toUpperCase()).filter(Boolean)};const next=[...rooms,room];setRooms(next);saveRooms(next);setRoomName("");console.log("Thêm phòng:",room);}
  function removeRoom(id:number):void{if(rooms.length<=1){alert("Phải có ít nhất một phòng.");return;}const next=rooms.filter(r=>r.id!==id);setRooms(next);saveRooms(next);console.log("Xóa phòng:",id);}
  function savePrices():void{savePriceConfig(priceConfig);alert("Đã lưu giá vé.");console.log("Cấu hình giá:",priceConfig);}

  return (
    <main className="container section admin-page">
      <span className="tag-red">ADMIN</span>

      <h1>Quản trị hệ thống</h1>

      <p className="admin-intro">
        Quản lý phim, suất chiếu, vé đặt và theo dõi doanh thu.
      </p>

      <section className="admin-box admin-section-box">
        <div className="admin-box-title">
          <div>
            <span className="admin-label">ROOMS</span>
            <h2>Quản lý phòng chiếu</h2>
          </div>
          <span className="admin-count">{rooms.length} phòng</span>
        </div>

        <div className="admin-form">
          <label>
            Tên phòng
            <input value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="Ví dụ: Phòng 04" />
          </label>
          <div className="admin-form-row">
            <label>
              Số hàng
              <input type="number" min="1" max="26" value={roomRows} onChange={(e) => setRoomRows(Number(e.target.value))} />
            </label>
            <label>
              Ghế mỗi hàng
              <input type="number" min="1" value={roomSeats} onChange={(e) => setRoomSeats(Number(e.target.value))} />
            </label>
          </div>
          <label>
            Hàng VIP
            <input value={vipRows} onChange={(e) => setVipRows(e.target.value)} placeholder="Ví dụ: E,F" />
          </label>
          <button type="button" className="btn" onClick={addRoom}>+ THÊM PHÒNG</button>
        </div>

        <div className="admin-list">
          {rooms.map((room) => (
            <div className="admin-row" key={room.id}>
              <div>
                <strong>{room.name}</strong>
                <p>{room.rows} hàng × {room.seatsPerRow} ghế • VIP: {room.vipRows.join(", ") || "Không có"}</p>
              </div>
              <button type="button" className="delete" onClick={() => removeRoom(room.id)}>Xóa</button>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-box admin-section-box">
        <div className="admin-box-title">
          <div>
            <span className="admin-label">PRICING</span>
            <h2>Cấu hình giá vé theo khung giờ</h2>
          </div>
        </div>
        <div className="admin-form-row">
          <label>Ghế thường (VNĐ)<input type="number" min="0" value={priceConfig.normal} onChange={(e) => setPriceConfig({ ...priceConfig, normal: Number(e.target.value) })} /></label>
          <label>Ghế VIP (VNĐ)<input type="number" min="0" value={priceConfig.vip} onChange={(e) => setPriceConfig({ ...priceConfig, vip: Number(e.target.value) })} /></label>
        </div>
        <div className="admin-form-row">
          <label>Trước 17:00 (%)<input type="number" min="0" value={priceConfig.before17 * 100} onChange={(e) => setPriceConfig({ ...priceConfig, before17: Number(e.target.value) / 100 })} /></label>
          <label>17:00–22:00 (%)<input type="number" min="0" value={priceConfig.evening * 100} onChange={(e) => setPriceConfig({ ...priceConfig, evening: Number(e.target.value) / 100 })} /></label>
          <label>Sau 22:00 (%)<input type="number" min="0" value={priceConfig.lateNight * 100} onChange={(e) => setPriceConfig({ ...priceConfig, lateNight: Number(e.target.value) / 100 })} /></label>
        </div>
        <button type="button" className="btn" onClick={savePrices}>LƯU CẤU HÌNH GIÁ</button>
        <p className="admin-note">Ví dụ 90% nghĩa là giảm 10% so với giá cơ bản.</p>
      </section>

      <section className="admin-box admin-section-box">
        <div className="admin-box-title">
          <div>
            <span className="admin-label">REPORT</span>
            <h2>Doanh thu theo phim</h2>
          </div>
        </div>
        {topMovies.length === 0 ? (
          <div className="admin-empty">Chưa có dữ liệu doanh thu.</div>
        ) : (
          topMovies.map(([movieName, revenue]) => (
            <div className="admin-row" key={movieName}>
              <strong>{movieName}</strong>
              <strong>{money(revenue)}</strong>
            </div>
          ))
        )}
      </section>

      <section className="admin-stats">
        <div className="admin-stat-card">
          <span>🎬</span>
          <strong>{movieList.length}</strong>
          <small>Tổng số phim</small>
        </div>

        <div className="admin-stat-card">
          <span>🕐</span>
          <strong>{showtimes.length}</strong>
          <small>Suất chiếu</small>
        </div>

        <div className="admin-stat-card">
          <span>🎟️</span>
          <strong>{totalTickets}</strong>
          <small>Vé đã thanh toán</small>
        </div>

        <div className="admin-stat-card">
          <span>💺</span>
          <strong>{totalSeats}</strong>
          <small>Ghế đã bán</small>
        </div>

        <div className="admin-stat-card admin-stat-revenue">
          <span>💰</span>
          <strong>
            {totalRevenue.toLocaleString("vi-VN")}đ
          </strong>
          <small>Doanh thu</small>
        </div>
      </section>

      <section className="admin-grid">
        <div className="admin-box">
          <div className="admin-box-title">
            <div>
              <span className="admin-label">
                {editingId === null ? "THÊM MỚI" : "CHỈNH SỬA"}
              </span>
              <h2>
                {editingId === null
                  ? "Thêm phim"
                  : "Sửa thông tin phim"}
              </h2>
            </div>

            {editingId !== null && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={resetMovieForm}
              >
                Hủy sửa
              </button>
            )}
          </div>

          <div className="admin-form">
            <label>
              Tên phim
              <input
                placeholder="Ví dụ: Avengers"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>

            <label>
              Thể loại
              <input
                placeholder="Ví dụ: Hành động"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
              />
            </label>

            <div className="admin-form-row">
              <label>
                Thời lượng (phút)
                <input
                  type="number"
                  min="1"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </label>

              <label>
                Điểm đánh giá
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                />
              </label>
            </div>

            <label>
              Trạng thái
              <select
                value={status}
                onChange={(e) =>
                  setStatus(
                    e.target.value === "coming"
                      ? "coming"
                      : "now"
                  )
                }
              >
                <option value="now">Đang chiếu</option>
                <option value="coming">Sắp chiếu</option>
              </select>
            </label>

            <button
              type="button"
              className="btn"
              onClick={addOrUpdateMovie}
            >
              {editingId === null
                ? "+ THÊM PHIM"
                : "💾 LƯU THAY ĐỔI"}
            </button>
          </div>
        </div>

        <div className="admin-box">
          <div className="admin-box-title">
            <div>
              <span className="admin-label">CRUD PHIM</span>
              <h2>Danh sách phim</h2>
            </div>
            <span className="admin-count">
              {movieList.length} phim
            </span>
          </div>

          <div className="admin-movie-list">
            {movieList.map((movie) => (
              <div className="admin-movie-row" key={movie.id}>
                <div className="admin-movie-info">
                  <strong>{movie.title}</strong>
                  <span>
                    {movie.genre} • {movie.duration} phút • ⭐{" "}
                    {movie.rating}
                  </span>
                  <em
                    className={
                      movie.status === "now"
                        ? "status-now"
                        : "status-coming"
                    }
                  >
                    {movie.status === "now"
                      ? "Đang chiếu"
                      : "Sắp chiếu"}
                  </em>
                </div>

                <div className="admin-actions">
                  <button
                    type="button"
                    className="btn btn-small btn-edit"
                    onClick={() => editMovie(movie)}
                  >
                    Sửa
                  </button>

                  <button
                    type="button"
                    className="delete"
                    onClick={() => deleteMovie(movie.id)}
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="admin-box admin-section-box">
        <div className="admin-box-title">
          <div>
            <span className="admin-label">SHOWTIME</span>
            <h2>Quản lý suất chiếu</h2>
          </div>
          <span className="admin-count">
            {showtimes.length} suất
          </span>
        </div>

        <div className="showtime-form">
          <label>
            Phim
            <select
              value={showMovieId}
              onChange={(e) =>
                setShowMovieId(Number(e.target.value))
              }
            >
              {movieList.map((movie) => (
                <option key={movie.id} value={movie.id}>
                  {movie.title}
                </option>
              ))}
            </select>
          </label>

          <label>
            Rạp
            <select
              value={showCinema}
              onChange={(e) => setShowCinema(e.target.value)}
            >
              {cinemas.map((cinema) => (
                <option key={cinema.id} value={cinema.name}>
                  {cinema.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Ngày
            <select
              value={showDate}
              onChange={(e) => setShowDate(e.target.value)}
            >
              {showDates.map((date) => (
                <option key={date.id} value={date.value}>
                  {date.label} - {date.value}
                </option>
              ))}
            </select>
          </label>

          <label>
            Giờ
            <input
              type="time"
              value={showTime}
              onChange={(e) => setShowTime(e.target.value)}
            />
          </label>

          <label>
            Giá vé
            <input
              type="number"
              min="0"
              value={showPrice}
              onChange={(e) => setShowPrice(e.target.value)}
            />
          </label>

          <button
            type="button"
            className="btn"
            onClick={addShowtime}
          >
            + THÊM SUẤT
          </button>
        </div>

        {showtimes.length === 0 ? (
          <div className="admin-empty">
            Chưa có suất chiếu. Hãy thêm suất chiếu mới.
          </div>
        ) : (
          <div className="showtime-table-wrap">
            <table className="showtime-table">
              <thead>
                <tr>
                  <th>Phim</th>
                  <th>Rạp</th>
                  <th>Ngày</th>
                  <th>Giờ</th>
                  <th>Giá</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {showtimes.map((showtime) => (
                  <tr key={showtime.id}>
                    <td>{showtime.movieTitle}</td>
                    <td>{showtime.cinema}</td>
                    <td>{showtime.date}</td>
                    <td>{showtime.time}</td>
                    <td>
                      {showtime.price.toLocaleString("vi-VN")}đ
                    </td>
                    <td>
                      <button
                        type="button"
                        className="delete"
                        onClick={() =>
                          deleteShowtime(showtime.id)
                        }
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-box admin-section-box">
        <div className="admin-box-title">
          <div>
            <span className="admin-label">TICKETS</span>
            <h2>Quản lý vé đặt</h2>
          </div>
          <span className="admin-count">
            {tickets.length} vé
          </span>
        </div>

        {tickets.length === 0 ? (
          <div className="admin-empty">
            Chưa có vé nào được đặt.
          </div>
        ) : (
          <div className="ticket-admin-list">
            {tickets
              .slice()
              .reverse()
              .map((ticket) => (
                <div
                  className="ticket-admin-row"
                  key={ticket.code}
                >
                  <div>
                    <strong>{ticket.code}</strong>
                    <span>{ticket.movie}</span>
                  </div>

                  <div>
                    <span>
                      {ticket.cinema ?? "Chưa có rạp"}
                    </span>
                    <small>
                      {ticket.date} • {ticket.time}
                    </small>
                  </div>

                  <div>
                    <span>
                      Ghế: {ticket.seats.join(", ")}
                    </span>
                    <small>
                      {ticket.userEmail ?? "Khách vãng lai"}
                    </small>
                  </div>

                  <div className="ticket-admin-total">
                    <strong>
                      {ticket.total.toLocaleString("vi-VN")}đ
                    </strong>
                    <em
                      className={
                        ticket.paymentStatus === "paid"
                          ? "payment-paid"
                          : "payment-pending"
                      }
                    >
                      {ticket.paymentStatus === "paid"
                        ? "Đã thanh toán"
                        : ticket.paymentStatus === "cancelled"
                          ? "Đã hủy"
                          : "Chờ thanh toán"}
                    </em>
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>

      <section className="admin-box admin-section-box">
        <div className="admin-box-title">
          <div>
            <span className="admin-label">REPORT</span>
            <h2>Thống kê doanh thu</h2>
          </div>
        </div>

        {topMovies.length === 0 ? (
          <div className="admin-empty">
            Chưa có dữ liệu doanh thu. Hãy thực hiện một đơn đặt vé
            và thanh toán để xem thống kê.
          </div>
        ) : (
          <div className="revenue-list">
            {topMovies.map(([movieTitle, revenue], index) => (
              <div className="revenue-row" key={movieTitle}>
                <span className="revenue-rank">
                  #{index + 1}
                </span>

                <div className="revenue-movie">
                  <strong>{movieTitle}</strong>
                  <span>Doanh thu từ vé đã thanh toán</span>
                </div>

                <strong className="revenue-number">
                  {revenue.toLocaleString("vi-VN")}đ
                </strong>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function App() {

  return (

    <>
      <Header />

      <Routes>

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/movies"
          element={<Movies />}
        />

        <Route
          path="/movie/:id"
          element={
            <MovieDetail />
          }
        />

        <Route
          path="/booking/:id"
          element={
            <Booking />
          }
        />

        <Route
          path="/ticket/:code"
          element={
            <Ticket />
          }
        />

        <Route
          path="/payment"
          element={
            <Payment />
          }
        />

        <Route
          path="/history"
          element={
            <History />
          }
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/account"
          element={<Account />}
        />

        <Route
          path="/admin"
          element={
            <Admin />
          }
        />

      </Routes>

      <footer>
        🎬 CINEMA BOOKING © 2026
        <br />
        Website đặt vé xem phim trực tuyến
      </footer>

    </>

  );

}

export default App;