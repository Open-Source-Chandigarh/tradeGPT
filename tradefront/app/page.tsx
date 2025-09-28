'use client';
import { use, useEffect, useRef, useState } from 'react';
import { signIn, signOut, useSession } from "next-auth/react";
import Image from "next/image";
import { Raleway } from 'next/font/google';
import styles from "./styles/styles.module.css"
import GradientLoadingBar from './components/GradientLoadBar';
import { useRouter } from "next/navigation";
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
};

export default function page() {

  // {type:"whichstock",by:"server",extramsg:"Which Stock you are talking about?",stockstypes:[{logo:"https://rilstaticasset.akamaized.net/sites/default/files/2023-02/L.1.jpg", name:"RELIANCE.NS" ,price:"₹30.33"}]}
  const router = useRouter();

  const [chats, setChats] = useState<Chat[]>([]);
  const { data: session } = useSession();


  useEffect(()=>{
    if(session){
      const id = uuidv4();
      router.push(`/chat/${id}`)
    }
  },[session])


  useEffect(()=>{
    // if(localStorage){
    //   let leftprompt = localStorage.getItem('promptinput')
    //   if(leftprompt?.trim()!==""){
    //   setChats((chat)=>[...chat,{type:"text",by:"user",content:leftprompt}])
    //   localStorage.setItem('promptinput','')
    //   }
    // }
  },[])




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



async function handleSubmit(prompt?: string){
 
  if(toAsk.trim()!=""||prompt?.trim()!=""){
  setRunning(true)
  if (!session){
    if(localStorage){
    await localStorage.setItem('promptinput',prompt?prompt:toAsk)
    }
    signIn("google")
  }
  if(!running){
      setChats((chat)=>[...chat,{type:"text",by:"user",content:prompt?prompt:toAsk}])
  }
  setToAsk('')
  }
}

async function handleStop() {
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



  return (
    <div className="bg-[#151515] h-[100vh] px-10 py-6">
      <div className="flex flex-row justify-between items-center">
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
          {session&&
            <div  className={`rounded-full px-4 py-2 border border-[#ffffff26] font-semibold cursor-pointer hover:bg-[#ffffff0a]  ${styles.grad}`}>
              3 Free chats left
            </div>
          }
          {session&&
          <button onClick={() => signOut()} className="ml-2 rounded-full px-4 py-2 border border-[#ffffff26] font-semibold cursor-pointer hover:bg-[#ffffff0a]">
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
    <div className='w-full h-[300px] flex justify-center'>
      <div className='flex flex-col  min-w-3xl max-w-3xl mt-20 h-[300px]'>


{chats.map((data, i) => {
  if (data.by === "user") {
    return (
      <div
        key={i}
        className="flex ml-auto mb-[30px] justify-center bg-[#303030] px-[22px] py-[8px] rounded-[30px]"
      >
        {data.content}
      </div>
    )
  }

  if (data.by === "assistant") {
    return (
      <div
        key={i}
        className="[letter-spacing:1px] [word-spacing:0.1rem] leading-7 mb-[50px] flex mr-auto justify-center px-[22px] py-[8px] rounded-[30px]"
      >
        {data.content}
      </div>
    )
  }
  if (data.type === "modeltraning") {
    return (
      <GradientLoadingBar key={i} duration={240} />
    )
  }
  if (data.type === "whichstock") {
    return (
      <div key={i}>

        <div className='mb-2'>{data.extramsg}</div>
        <div className='w-full flex items-left font-sans flex-wrap'>
        {data.stockstypes?.map((stock, i) => (
          <div key={i} className=" flex flex-col items-center px-2 mx-2 mb-4 pb-2 py-4 rounded-sm bg-[#8484844f] cursor-pointer hover:bg-[#2f2e2e] active:bg-[#8484844f]">
            <img className ='w-[200px] pb-2' src={stock.logo} alt="logo" />
            {stock.name} - {stock.price}
          </div>
        ))}
        </div>

      </div>
    )
  }

  return null
})}

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



    </div>
  );
}
