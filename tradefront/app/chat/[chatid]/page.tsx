'use client';
import { use, useEffect, useRef, useState } from 'react';
import { signIn, signOut, useSession } from "next-auth/react";
import Image from "next/image";
import { Raleway } from 'next/font/google';
import styles from "../../styles/styles.module.css"
import GradientLoadingBar from '../../components/GradientLoadBar';
import { useRouter } from "next/navigation";
import { Sparkles, MessageCircle, Image as ImageIcon, Brain, Calendar, FolderCog, Video, Code2 } from "lucide-react";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from 'uuid';



const raleway = Raleway({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-raleway',
});

type Chat = {
  type: string;
  by: string;
  extramsg?:string;
  content?: string | null ;
  stockstypes?:Array<any>;
  used?:boolean;
  completed?:boolean;
};

type ServerResponse = {
  toappend: Chat;
};

export default function page({ params }: { params: Promise<{ chatid: string }> }) {


  // {type:"whichstock",by:"server",extramsg:"Which Stock you are talking about?",stockstypes:[{logo:"https://rilstaticasset.akamaized.net/sites/default/files/2023-02/L.1.jpg", name:"RELIANCE.NS" ,price:"₹30.33"}]}
  // {type:"modeltraning",by:"server",content:"hello world"}
  const router = useRouter();

const features = [
  { icon: Sparkles, text: "Solve complex trading strategies with AI" },
  { icon: MessageCircle, text: "Get unlimited chats" },
  { icon: Brain, text: "Analyze market data and predict trends intelligently" },
  { icon: Code2, text: "Backtest and deploy custom trading algorithms (coming soon)" },
  { icon: FolderCog, text: "Save memory from past conversations" },
];






  const [chats, setChats] = useState<Chat[]>([]);
  const [freechat, setFreeChat] = useState("");
  const [shouldloadanswer, setshouldloadanswer] = useState(true);
  const [shouldloadanswercontent, setshouldloadanswercontent] = useState<Chat>();
  const [loadingai, setloadingai] = useState(false);
  const { data: session } = useSession();
  const { chatid } = use(params); 
  const [selectedchat,setselectedchat] = useState(chatid)
  const [allchats,setallchats] = useState<string[]>([])
  const [allchatstitle,setallchatstitle] = useState<String[]>([])
  const [upgradetopro,setupgradetopro] = useState(false)
  const [ispro,setispro] = useState(false)

const hasRunOnce = useRef(false);





useEffect(() => {

  // console.log(session)



  const handleRemaining = async () => {
  if (hasRunOnce.current) return;
  hasRunOnce.current = true;
    if (typeof localStorage === "undefined" || !session) return;
    const leftprompt = localStorage.getItem("promptinput");
    if (leftprompt && leftprompt.trim() !== "") {
      setRunning(true)
      setChats((prevChats) => [
        ...prevChats,
        { type: "text", by: "user", content: leftprompt },
      ]);

        await sendques(leftprompt); 
        localStorage.setItem("promptinput", "");
      
    }
  };
  if(session){
    handleRemaining();
  }
}, [session]);



  


  useEffect(() => {

    async function fetchUser() {
      if (!session?.user) return;

      try {
        const res = await fetch("/api/freechats", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
                // console.log(session.user.token)
                    // console.log(session.user.token)

            Authorization: `Bearer ${(session as any)?.verifyToken}`, 
          },
          body: JSON.stringify({}),
        });

        if (!res.ok) {
          console.log('error')
        }

        const data = await res.json();
        if(res.status==200){
          setFreeChat(data.chats.toString())
          setispro(data.paidacc)
        }
      } catch (err) {
        console.error("Error fetching user:", err);
      }
    }

    if(session){
      fetchUser();
    }
  }, [session]);




// let totalchats=0;

  useEffect(() => {

    async function getchat() {
      if (!session?.user) return;
      // totalchats+=1;
      try {
        const res = await fetch("/api/getchat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
                // console.log(session.user.token)
                    // console.log(session.user.token)

            Authorization: `Bearer ${(session as any)?.verifyToken}`, 
          },
          body: JSON.stringify({chatid:selectedchat}),
        });

        if (!res.ok) {
          console.log('error')
        }

        const data = await res.json();
        console.log(data)
        if(res.status==200){
          if(data.chatdata.length>0){

          // const filtered = data.chatdata.filter((obj: Chat) => !obj.by ||  obj.by === 'user' || obj.by === 'assistant')


          const filtered = data.chatdata.filter(
  (obj: Chat) =>

    obj.by === 'user' ||
    obj.by === 'assistant' ||
    obj.type === 'whichstock'
);


 





      // console.log(filtered)
            if(session){
                console.log(data.chatdata)
                console.log(loadingai)
                if(filtered.length%2==0){
                  setloadingai(false);
                }else{
                  setloadingai(true);
              }
            }

          setChats(data.chatdata)
          }
        }
      } catch (err) {
        console.error("Error fetching user:", err);
      }
    }

    // if(session && totalchats!=1){
  if(session && selectedchat!=""){
      getchat();
    }
  }, [selectedchat,session]);







  






    useEffect(() => {
  document.body.classList.add('chat-scroll');
  return () => {
    document.body.classList.remove('chat-scroll');
  };
}, []);


  const [toAsk, setToAsk] = useState(""); 
  const [running, setRunning] = useState(false); 


 const textareaRef = useRef<HTMLTextAreaElement>(null);

const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  setToAsk(e.target.value);

  if (textareaRef.current) {
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";

    const maxHeight = 200;
    if (textareaRef.current.scrollHeight > maxHeight) {
      textareaRef.current.style.height = maxHeight + "px";
      textareaRef.current.style.overflowY = "auto";
    } else {
      textareaRef.current.style.overflowY = "hidden";
    }
  }
};



async function handleSubmit(prompt?: string|undefined){

  if(toAsk.trim()!==""|| prompt!==undefined && prompt?.trim()!=""){
  setRunning(true)
  if (!session){
    if(localStorage){
    await localStorage.setItem('promptinput',prompt?prompt:toAsk)
    }
    signIn("google")
  }
  if(!running){
    setChats((chat)=>[...chat,{type:"text",by:"user",content:prompt?prompt:toAsk}])
    if(session){
      sendques(prompt?prompt:toAsk)
      setFreeChat((freechats) => {
        const count = parseInt(freechats, 10) || 0;
        return count > 0 ? (count - 1).toString() : "0";
      });

    }
    setToAsk('')
    }
  }

}

















const runningRef = useRef(running);

useEffect(() => {
  runningRef.current = running; // keep ref updated
}, [running]);

function appendChatWithTypewriter(newChat: Chat) {
  setChats((prevChats) => {
    const updatedChats = [...prevChats, { ...newChat, content: "" }];
    const index = updatedChats.length - 1;
    const fullText = newChat.content || "";

    let i = 0;
    const interval = setInterval(async() => {
      // Use ref to check current running state
      if (!runningRef.current) {
        clearInterval(interval);
        return;
      }

      if (i <= fullText.length) {
        setChats((prev) => {
          const copy = [...prev];
          copy[index] = { ...copy[index], content: fullText.slice(0, i) };
          return copy;
        });

        if (i === fullText.length - 1) {
          setRunning(false);
          clearInterval(interval);

          if(fullText=="Your free chat limit has been reached."){
            await new Promise(res => setTimeout(res, 800));
            setupgradetopro(true);
          }
        }

        i++;
      } else {
        clearInterval(interval);
      }
    }, 20); // 50ms per character for smoother typing

    return updatedChats;
  });
}












async function sendques(ques:string) {
  setloadingai(true)
      if (!session?.user) return;

      try {
        const res = await fetch("/api/getanswer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(session as any)?.verifyToken}`, 
          },
          body: JSON.stringify({fullchat:chats,ques,chatid:selectedchat}),
        });

        if (!res.ok) {
          console.log('error')
        }

        const data = await res.json();
        console.log(data)

        if(res.status==200){
          setloadingai(false)
          if(session){
            getallchats();
          }
          // setChats((chat)=>[...chat,data.toappend])
          if(data.by=="server"){

          setRunning(false)
          await setChats((chat)=>[...chat,data])
        }else{
          if(shouldloadanswer){
          if (chats[chats.length - 1]?.content === "hello world") {
              setChats(prev => prev.slice(0, -1));
          }
          appendChatWithTypewriter(data.toappend);
          }else{
            setshouldloadanswercontent(data.toappend)
          }
        }

        console.log(chats)
       
}
      } catch (err) {
        setloadingai(false)
        console.error("Error fetching user:", err);
      }
}



async function handleStop() {
    setloadingai(false)
    setRunning(false);
}




  const [ques, setQues] = useState([
  "When is the best time to invest in TCS?",
  "Should I make a Call option on Infosys?",
  "Is it safe to buy a Put option on Adani today?",
  "Should I enter Futures for HDFC Bank?",
  "Is it a good idea to short sell ITC right now?",
  "Should I buy SBI shares or wait?",
  "Is Wipro stock bullish enough for a Call option?",
  "Should I hedge Tata Motors with a Put?",
  "Is today the right day to go long on HUL?"
]);




const handleStockClick = async (stock: any) => {
  await setChats((prevChats) => {
    if (prevChats.length === 0) return prevChats;

    const updatedChats = [...prevChats];
    const lastChat = { ...updatedChats[updatedChats.length - 1] };

    if (lastChat.type === "whichstock" && Array.isArray(lastChat.stockstypes)) {
      lastChat.stockstypes = lastChat.stockstypes.map((s: any) =>
        s.symbol === stock.symbol
          ? { ...s, selected: true }
          : { ...s, selected: false }
      );


      lastChat.used = true;
      updatedChats[updatedChats.length - 1] = lastChat;
    }
    console.log(updatedChats)



    
    async function updatechat() {
      
      if (!session?.user) return;
      
      try {
        const res = await fetch("/api/updatedchat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
                // console.log(session.user.token)
                // console.log(session.user.token)

            Authorization: `Bearer ${(session as any)?.verifyToken}`, 
          },
          body: JSON.stringify({chatid:selectedchat,fullchat:updatedChats}),
        });

        if (!res.ok) {
          console.log('error')
        }
        
        const data = await res.json();
        console.log(data)
        if(res.status==200){
          // setChats(data.chatdata)
        }
      } catch (err) {
        console.error("Error fetching user:", err);
      }
    }
    
    updatechat()
    
    return updatedChats;
  });
  
  
  setChats((chat)=>[...chat,{type:"modeltraning",by:"server",content:"hello world",completed:false}])
  // sendques(`i want to know about ${stock.name} stock with symbol ${stock.symbol} on ${stock.exchange}`);
  await handleSubmit(`~~~i want to know about ${stock.name} stock with symbol ${stock.symbol} on ${stock.exchange}`);
};


useEffect(() => {
  if (shouldloadanswer && shouldloadanswercontent) {
    appendChatWithTypewriter(shouldloadanswercontent);
    setshouldloadanswercontent(undefined);
  }
}, [shouldloadanswer]);




    async function getallchats() {
      if (!session?.user) return;

      try {
        const res = await fetch("/api/getallchats", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
                // console.log(session.user.token)
                    // console.log(session.user.token)

            Authorization: `Bearer ${(session as any)?.verifyToken}`, 
          },
          body: JSON.stringify({}),
        });

        if (!res.ok) {
          console.log('error')
        }

        const data = await res.json();
        console.log(data)
        if(res.status==200){
          setallchats(data.allchats);
          setallchatstitle(data.allchatstitle);
          console.log(data.allchats,data.allchatstitle)
        }
      } catch (err) {
        console.error("Error fetching user:", err);
      }
    }


  // useEffect(()=>{
  //   console.log("hello world")
  //   if(chatid && chats.length<1){
      


  //   if(session){
  //     getallchats();
  //   }

  //   }
  // },[selectedchat,session,chats.length])
  useEffect(()=>{
    console.log("hello world")
    if(chatid && chats.length<1){
      


    if(session){
      getallchats();
    }

    }
  },[session])






const createOrder = async (email: string) => {
  const res = await fetch("/api/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: 99, currency: "INR", email }),
  })

  const order = await res.json()

  const options = {
    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    amount: order.amount,
    currency: order.currency,
    name: "TradeGPT Pro",
    description: "Upgrade to Pro Plan",
    order_id: order.id,
    handler: async function (response: any) {
      try {
        // verify and update DB
        await fetch("/api/payments", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
            email,
          }),
        })
      } catch (err) {
        console.error("Payment verification failed:", err)
      } finally {
        // redirect to home either way
        router.push("/")
      }
    },
    notes: { email },
    theme: { color: "#753cde" },
    modal: {
      // Called when user closes popup without paying
      ondismiss: function () {
        // router.push("/")
      },
    },
  }

  if (!window.Razorpay) {
    alert("Razorpay SDK not loaded yet. Try again in a second.")
    return
  }

  const razor = new window.Razorpay(options)
  razor.open()
}




useEffect(() => {
  const script = document.createElement("script")
  script.src = "https://checkout.razorpay.com/v1/checkout.js"
  script.async = true
  document.body.appendChild(script)
}, [session])



  return (
    <div className={`bg-[#151515] ${chats.length>0?"mb-[400px]":"bg-[0px]"} px-10 py-6`}>


    <div className='font-light overflow-y-scroll font-sans h-auto max-h-[75%] w-[200px] fixed top-[120px] rounded-lg bg-[#1c1c1cbf] px-[5px]  py-[5px] left-[20px] border border-[#ffffff26] hide-scrollbar  '>

      <div onClick={()=>{router.push('/')}} className={`hover:cursor-pointer text-center w-full py-[5px] ${chats.length<=1?"bg-[#474545a1]":""} rounded-md hover:bg-[#787676a1]`}>New Chat</div>
      {
        allchatstitle.length>0?<hr className='mb-[10px] text-[#3f3f3f] mt-[5px]'/>:""
      }

    {/* {allchatstitle.map((title, index) => {
      // <div key={index} onClick={()=>{router.push(`/chat/${allchats[index]}`, { scroll: false })}} className={`hover:cursor-pointer  mt-[5px] text-center w-full py-[5px] ${allchats[index]==chatid?"bg-[#474545a1]":""} rounded-md  hover:bg-[#787676a1]`}>
     return( <div key={index} onClick={async()=>{ const newChatId = allchats[index];   window.history.pushState(null, "", `/chat/${newChatId}`);   setselectedchat(newChatId);}} className={`hover:cursor-pointer  mt-[5px] text-center w-full py-[5px] ${allchats[index]==selectedchat?"bg-[#474545a1]":""} rounded-md  hover:bg-[#787676a1]`}>
    {(() => {
        const words = title.split(" ");
        return words.length > 5 ? words.slice(0, 5).join(" ") + "..." : words.join(" ");
      })()}
        </div>)
    })} */}




{[...allchatstitle].reverse().map((title, i) => {
  const reversedIndex = allchatstitle.length - 1 - i;
  const chatId = allchats[reversedIndex];

  return (
    <div
      key={i}
      onClick={() => {
        window.history.pushState(null, "", `/chat/${chatId}`);
        setselectedchat(chatId);
      }}
      className={`hover:cursor-pointer mt-[5px] text-center w-full py-[5px] ${
        chatId === selectedchat ? "bg-[#474545a1]" : ""
      } rounded-md hover:bg-[#787676a1]`}
    >
        {(() => {
          const truncated = title.length > 20 ? title.slice(0, 20) + "..." : title;
          return truncated;
        })()}

    </div>
  );
})}


    </div>

    

      <div className="sticky top-[20px] flex flex-row justify-between items-center">
        <div className="flex flex-row justify-center items-center">
          <Image
            src="/logo.png"
            alt="Logo"
            width={74}
            height={39}
            className={raleway.className}
          />
          <div className="text-2xl ml-2">
            Trade<span className="font-bold text-2xl">GPT</span>
          </div>
        </div>

        <div className="flex flex-row justify-center items-center">
        {!session&&
          <button onClick={() => signIn("google")} className="rounded-full px-4 py-2 bg-white text-black font-semibold mr-2 cursor-pointer hover:bg-[#ffffffdb]">
            Log in
          </button>
        }
          {!session&&
          <button onClick={() => signIn("google")} className="rounded-full px-4 py-2 border border-[#ffffff26] font-semibold cursor-pointer hover:bg-[#ffffff0a]">
            Sign Up for free
          </button>
          }
          {/* {session&&
            <div  onClick={()=>{setupgradetopro(true)}} className={`rounded-full px-4 py-2 border border-[#ffffff26] font-semibold cursor-pointer hover:bg-[#ffffff0a]  ${styles.grad}`}>
              <span className='font-sans'>{freechat}</span> Free chats left
            </div>
          } */}

          {session && (
  ispro ? (
    // <div className="rounded-full px-4 py-2 border border-[#00ff8833] font-semibold text-[#00ff88]">
    //   Pro Account
    // </div>

    <div
  className="flex items-center gap-2 rounded-full px-4 py-2 font-semibold text-white shadow-md"
  style={{
    background:
      "linear-gradient(159deg, rgba(214, 173, 255, 1) 1%, rgba(117, 60, 222, 1) 51%, rgba(52, 41, 204, 1) 100%)",
  }}
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="w-5 h-5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
    />
  </svg>
  Pro Account
</div>

  ) : (
    <div
      onClick={() => setupgradetopro(true)}
      className={`rounded-full px-4 py-2 border border-[#ffffff26] font-semibold cursor-pointer hover:bg-[#ffffff0a] ${styles.grad}`}
    >
      <span className="font-sans">{freechat}</span> Free chats left
    </div>
  )
)}



          {session&&
          <button onClick={async () => {await signOut({redirect:false});router.push('/')}} className="ml-2 rounded-full px-4 py-2 border border-[#ffffff26] font-semibold cursor-pointer hover:bg-[#ffffff0a]">
            Logout
          </button>
          }
        </div>
      </div>


    {chats.length==0&&
      <div className=" font-semibold p-4 rounded text-3xl text-center mt-[100px]">
        {session&&<div className='mb-5'>Hlo, <span className='font-medium'>{session?.user?.name}</span><br/></div>}
        Ask me any Indian Stock Market Related Question
      </div>
    }

    {chats.length==0&&
    <div className='flex items-center justify-center'>
      <div className='flex items-center justify-center mt-[20px] flex-wrap max-w-300 '>
            {ques.map((question, i) => (
            <div
            onClick={()=>{setToAsk(question);handleSubmit(question);}}
                key={i}
                className=" mb-3 ml-2 mr-2 rounded-full px-4 py-2 border border-[#ffffff26] font-normal cursor-pointer hover:bg-[#ffffff0a]"
            >
                {question}
            </div>
            ))}
      </div>
    </div>
    }

    {chats.length==0  &&
        <div className='flex justify-center items-center'>
            <div className='text-red max-w-280 px-5 mt-10 text-center  text-sm text-yellow-600'>
            <span className='text-red-600'>Disclaimer</span>: Investment suggestions are based on a regression model trained on 2 months of hourly data and news sentiment. For informational purposes only—do not invest blindly. Always research the market and consult a financial advisor. We are not responsible for any profit or loss. Invest at your own risk.    
            </div>
        </div>
    }

    { chats.length>0&&
    <div className='w-full  flex justify-center'>
      <div className='flex flex-col  min-w-3xl max-w-4xl mt-20 '>


{chats.map((data, i) => {
  if (data.by === "user" && data.content!=undefined && data.content!=null) {
    if(data.content[0] != '~' && data.content[1] != '~' && data.content[2] != '~'){
    return (
      <div
        key={i}
        className="flex max-w-2xl ml-auto mb-[30px] justify-center bg-[#303030] px-[22px] py-[8px] rounded-[30px]"
      >
        {data.content}
      </div>
    )
    }
  }

  if (data.by === "assistant") {
    return (
      <div
        key={i}
        className="[letter-spacing:1px] [word-spacing:0.1rem]  max-w-2xl leading-7 mb-[50px] flex mr-auto justify-center px-[22px] py-[8px] rounded-[30px]"
      >
        {data.content}
      </div>
    )
  }
   if (data.by === "server") {
  if (data.type === "modeltraning") {
    return (
      <GradientLoadingBar key={i} duration={45}  loadcompleted={shouldloadanswer} setloadcompleted={setshouldloadanswer}/>
    )
  }
  if (data.type === "whichstock") {
    return (
      <div key={i} className={`${data.used?"select-none":""}`}>

        <div className='mb-2'>{data.extramsg}</div>
        <div className='w-full flex items-left font-sans flex-wrap'>
        {data.stockstypes?.map((stock, i) => (

          <div onClick={() => !(data.used)?handleStockClick(stock):null} key={i} className={`flex flex-col items-center px-2 mx-2 mb-4 bg-[#8484844f] pb-2 py-4 rounded-sm ${data.used?'':'cursor-pointer'}  ${data.used?"":"hover:bg-[#2f2e2e]"}  ${stock.selected ? "bg-[white]" : "bg-[#8484844f]"}    ${!(stock.selected)?'text-["#acabab"]':'text-[black]'}`}>
            {/* <img className ='w-[200px] pb-2' src={stock.logoname} alt="logo" /> */}
            <div className ={`w-[200px] pb-2 text-center ${!(stock.selected)?'text-["#acabab"]':'text-[black]'}  font-[800]`}  >{stock.symbol}</div>
            {stock.name} - {stock.exchange}
          </div>
        ))}
        </div>

      </div>
    )
  }
  } 

  return null
})}
{loadingai&&
<div className="dots"></div>
}

      </div>
    </div>
    }


    <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 w-full px-4 flex justify-center">
 <textarea
  ref={textareaRef}
  rows={1}
  value={toAsk}
  onChange={handleChange}
   onKeyDown={(e) => {
    if (e.key === "Enter" && !e.shiftKey) { // Enter without Shift
      e.preventDefault(); // Prevent newline
      handleSubmit();     // Call your function
    }
  }}
  placeholder="Ask anything related to Indian Stock Market"
  className={`w-full font-medium max-w-2xl p-3 bg-[#242424] shadow-md resize-none focus:outline-none text-white overflow-y-auto max-h-52 ${styles.input}`}
/>


{running?(
    <div onClick={()=>{handleStop()}} className={`flex justify-center items-center   h-[50px] w-[50px] rounded-full mt-[6px] ml-[-57px]    cursor-pointer bg-[#424242]  hover:bg-[#4b4b4bdb] active:bg-[#646161db] ease-linear`}>
        <div className='w-[15px] h-[15px] bg-white rounded-xs'></div>
    </div>
):(
    <div onClick={()=>{handleSubmit()}} className={`flex justify-center items-center   h-[50px] w-[50px] rounded-full mt-[6px] ml-[-57px]    ${toAsk.length!=0?"cursor-pointer bg-white active:bg-[#ffffffd4] ":"bg-[#ffffffb3]"}   ease-linear`}>
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className=" text-[#242424] font-semibold size-6">
  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
  </svg>
  </div>
)}
</div>


{(upgradetopro&&session)&&
<div className="fixed inset-0 flex items-center justify-center bg-[#0000007d]">
  <div className="bg-white/7 backdrop-blur-md p-10 border border-white/20 w-[400px] h-[600px] rounded-xl flex flex-col">


    <div onClick={()=>{setupgradetopro(false)}} className="mt-[-10px] mr-[-10px] inline-flex self-end items-center justify-center p-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 transition-all duration-300 hover:bg-white/20 hover:scale-105 hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] cursor-pointer">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
        strokeWidth="1.5" stroke="currentColor"
        className="w-5 h-5 text-white/90 hover:text-white transition-colors duration-300">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
      </svg>
    </div>


<div className='flex item-center '>
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6 mr-[5px] text-[#a197f3]">
  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
  </svg>

  <div className="mt-[-10px] text-[2.0rem] font-bold bg-gradient-to-r from-[#753cde] via-[#d6adff] to-[#d6adff] bg-clip-text text-transparent">
    Pro                                                     
  </div>    
</div>

<div className='font-bold text-white text-[50px] flex items-center justify-bottom mt-[-10px]'>
  <span className='text-[35px] font-light mr-[5px]  text-[#ffffff59]'>₹</span><span className=' tracking-wide'>99</span>
  <span className='font-light text-[12px] ml-[4px] mt-[44px] text-[#b1b1b2]'>INR/Month</span>
</div>


<div className='mt-[20px] font-medium text-[15px]'>
  Unlock the full experience
</div>

<div className="w-full h-[1px] rounded-full bg-[#373636] mt-[20px]"></div>





     <div className="mt-[30px] text-white w-fit  rounded-xl flex flex-col gap-4">
      {features.map(({ icon: Icon, text }, index) => (
        <div key={index} className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-white/80" />
          <span className="text-sm font-medium">{text}</span>
        </div>
      ))}
    </div>



     <button onClick={() => {
    if (!session?.user?.email) return
    createOrder(session.user.email)
  }}  className="relative mt-[30px] hover:cursor-pointer overflow-hidden rounded-full px-6 py-3 font-semibold text-white text-lg transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]">
      <div className="absolute inset-0 bg-[linear-gradient(159deg,#d6adff_1%,#753cde_51%,#3429cc_100%)] opacity-90" />

      <div className="absolute inset-0 bg-gradient-to-t from-white/30 via-transparent to-transparent mix-blend-overlay" />

      <div className="absolute inset-0 backdrop-blur-[2px]" />

      <span  className="relative z-10">Get Pro</span>

      {/* <span  className="relative z-10">Get Pro</span> */}


      <div className="absolute -inset-[1px] rounded-xl bg-[linear-gradient(159deg,#d6adff_1%,#753cde_51%,#3429cc_100%)] opacity-40 blur-md -z-10" />
    </button>



  </div>
</div>
}



    </div>
  );
}
