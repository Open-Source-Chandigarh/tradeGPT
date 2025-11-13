import dbConnect from "../../utlis/dbConn";
import Users from "../../models/Users";
import Chat from "../../models/Chats";
import Stocks from "../../models/Stocks";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import jwt, { JwtPayload } from "jsonwebtoken";
import axios from "axios";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import { any, z } from "zod";

import { setEmbeddingSource, getEmbedding, searchQdrant } from "./createEmbeddings";
import Stock from "../../models/Stocks";

console.log("Server started ");



type Chat = {
  type: string;
  by: string;
  extramsg?:string;
  content?: string | null ;
  stockstypes?:Array<any>;
};

var mychats:any =[]

export async function POST(req:NextRequest,res:NextResponse) {
  try {

    await dbConnect();



    const body = await req.json(); 
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1];


    if (!token) return NextResponse.json({ message: "No token" }, { status: 401 });

    if (!process.env.NEXTAUTH_SECRET) {
        throw new Error("NEXTAUTH_SECRET is not defined");
    }


    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET as string) as JwtPayload & { id: string };
    console.log("body:",body); 

    const user = await Users.findOne({email:decoded.email}).exec();
    if (user) {
      let userchattemp=user.freechats
      user.freechats>0?user.freechats -= 1:" ";
          if (user.subscriptiontill && user.subscriptiontill < new Date()) {
            user.paidacc = false
            user.freechats = 3
            user.razorpayPaymentId = ""

            await user.save();
          }
      await user.save();
      if(userchattemp<=0 && !user.paidacc){
        return NextResponse.json(
          { toappend: { type: "answer", by: "assistant", content: "Your free chat limit has been reached." } },
          { status: 200 }
        );
      }
    }

    
    let chatidalredyexists = await Chat.findOne({chatid:body.chatid});
    if(!chatidalredyexists){
    if(body.fullchat.length<=0){
      const newChat = await new Chat({
        userid:user._id,
        chatid:body.chatid,
        chats:[...body.fullchat,{by: "user",role: "user",content: body.ques}],
        title:body.ques
      });
      
      await Users.findOneAndUpdate(
        { _id: user._id }, 
        { $push: { chats: newChat._id,allchatstitle: body.ques,chatids: body.chatid } },
        { new: true }
      );
      await newChat.save(); 
    }
    }

    
    

    let againuser = await Users.findOne({_id:user._id}).exec();
    let foundchat = await Chat.findOne({chatid:body.chatid}).exec();
    if(!foundchat){
      return NextResponse.json(
                        { toappend: { type: "answer", by: "assistant", content: "Unable to authenticate your chat please reload." } },
                        { status: 200 }
      );
    }
   
    if (!againuser.chats.includes(foundchat._id)) {
      console.log(Array.isArray(againuser.chats));
      console.log(againuser.chats.includes(foundchat._id));
        return NextResponse.json(
                        { toappend: { type: "answer", by: "assistant", content: "Unable to authenticate your chat please reload." } },
                        { status: 200 }
        );
    }


    



    if(body.fullchat.length>0){
    const newupdatedchat = await Chat.findOneAndUpdate(
      { chatid: body.chatid },
      { $push: { chats: { by: "user", role: "user", content: body.ques } } },
      { new: true }
    );
    }
    



    let resultfromai = await nowaihandles(body.fullchat,body.ques,user._id,body.chatid,user.username)
    console.log(resultfromai);


    



      // if (typeof resultfromai === "object" && resultfromai !== null && "directlyreturns" in resultfromai) {
      //   console.log("helloworld🍕🍕🍕🍕🍕");
      // }

      if(resultfromai[0]=="{"){
        let parseddata = JSON.parse(resultfromai as string)
        if(parseddata.toappend){

          const updatedChat = await Chat.findOneAndUpdate(
            { chatid:body.chatid },                            
            { $push: { chats: parseddata.toappend } }, 
            { new: true }                         
          );

        return NextResponse.json(parseddata.toappend, { status: 200 });
        }else{
          
          const updatedChat = await Chat.findOneAndUpdate(
            { chatid:body.chatid },                            
            { $push: { chats:{ type: "answer", by: "assistant", content: parseddata.content } } }, 
            { new: true }                         
          );

          return NextResponse.json(
                { toappend: { type: "answer", by: "assistant", content: parseddata.content } },
                { status: 200 }
                );
        }
      }
      
    // Otherwise wrap it as an assistant message

      const updatedChat = await Chat.findOneAndUpdate(
            { chatid:body.chatid },                            
            { $push: { chats:{ type: "answer", by: "assistant", content: resultfromai } } }, 
            { new: true }                         
      );

    return NextResponse.json(
      { toappend: { type: "answer", by: "assistant", content: resultfromai } },
      { status: 200 }
    );


    // let bigtext = "resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai resultfromai "  
  } catch (e) {
  console.error(e); 
  return NextResponse.json(
    { message: "Server error, please try again!" },
    { status: 500 }
  );
}
}








let alreadyCalled = false;

const predictStock = tool(
  async (input) => {
    // if (!alreadyCalled) {
    alreadyCalled = true
    console.log("called predictStock tool");

    // try {
      const { data } = await axios.get("http://localhost:8000/predict", {
        params: {
          ticker: input.ticker,
          symbol: input.symbol,
          period: "2mo",
          interval: "1h",
          days_to_fetch: "5",
        },
      });
      console.log(data);
      let finalstringtopass = await fincalinvestmentcall(`The user wants to know the investment prediction for ${input.symbol} based on the following market data: ${JSON.stringify(data)}. Analyze this data thoroughly and provide a clear, confident, and straightforward answer — should the user invest in this stock or not? Avoid politeness; be factual and firm in your judgment.`)
      alreadyCalled = false
      return JSON.stringify({
        directlyreturns: true,
        content: finalstringtopass,
      });

    // } catch (error) {
      // console.error("Error fetching prediction:", error);
      // return "An error occurred while fetching the stock prediction data.";
    // }
  // }
  },
  {
    name: "predictStock",
    description:
      "Use this tool when you have the full name and ticker of a stock and need to analyze its performance. For example: if the user says 'I want to know about ADANI ENTERPRISES LIMITED with symbol ADANIENT.NS on NSE.' Use this tool only once per query.",
    schema: z.object({
      ticker: z.string().describe("Full Yahoo Finance ticker, e.g. 'ADANIENT.NS'"),
      symbol: z.string().describe("Stock symbol without '.NS', e.g. 'ADANIENT'"),
      period: z.string().describe("Data period to fetch, e.g. '3mo'"),
      interval: z.string().describe("Data interval, e.g. '1h'"),
      days_to_fetch: z.number().describe("Number of recent days of data to include in the prediction"),
    }),
    returnDirect: true,
  }
);








const findStocks = tool(
  async (input) => {
    const query = encodeURIComponent(input.name);
    const response = await fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${query}`);
    if (!response.ok) {
      throw new Error(`Yahoo Finance API call failed: ${response.statusText}`);
    }
    const data = await response.json();
    
        return data.quotes.map((item: { 
        symbol: string; 
        shortname?: string; 
        longname?: string; 
        exchange: string; 
      }) => ({
        symbol: item.symbol,
        name: item.shortname || item.longname || "",
        exchange: item.exchange,
      }));


  },
  {
    name: "findStocks",
    description: "Search Yahoo Finance for all stocks matching a given name.",
    schema: z.object({
      name: z.string().describe("The name or partial name of the company, e.g. 'Adani'."),
    }),
  }
);






let alreadyCalledAnalyze = false;

const analyzeBestTimeToInvest = tool(
  async (input) => {
    console.log("analyzeBestTimeToInvest tool called - entry", { input });

    // Prevent concurrent duplicate requests from the agent/planner
    if (alreadyCalledAnalyze) {
      console.log("analyzeBestTimeToInvest: already running, returning early.");
      return JSON.stringify({
        directlyreturns: true,
        content: "Tool already running. Please try again in a moment.",
      });
    }
    alreadyCalledAnalyze = true;

    try {
      // Basic input validation (fail fast)
      if (!input || !input.ticker || !input.symbol) {
        alreadyCalledAnalyze = false;
        return JSON.stringify({
          directlyreturns: true,
          content: "Missing required parameters: ticker and symbol.",
        });
      }

      // Use proper types (days_to_fetch should be a number)
      const params = {
        ticker: input.ticker,
        symbol: input.symbol,
        period: input.period || "3mo",
        interval: input.interval || "1h",
        days_to_fetch: typeof input.days_to_fetch === "number" ? input.days_to_fetch : 10,
      };

      // axios request with timeout and simple retry
      const axiosConfig = { timeout: 90000  }; // 15s timeout
      let data;
      try {
        const resp = await axios.get("http://localhost:8000/predict", {
          params,
          ...axiosConfig,
        });
        data = resp.data;
      } catch (err) {
        console.error("analyzeBestTimeToInvest: axios error", err || err);
        alreadyCalledAnalyze = false;
        return JSON.stringify({
          directlyreturns: true,
          content:
            "Error fetching prediction data from prediction service. Please ensure the service at http://localhost:8000/predict is running and returns valid JSON.",
        });
      }

      // Validate response shape before hitting the model
      if (!data || (typeof data !== "object" && !Array.isArray(data))) {
        console.error("analyzeBestTimeToInvest: invalid data shape", data);
        alreadyCalledAnalyze = false;
        return JSON.stringify({
          directlyreturns: true,
          content: "Prediction service returned invalid data. Aborting analysis.",
        });
      }

      // Build prompt for fincalinvestmentcall
      const query = `
        You are a professional Indian stock analyst. Based on the following data for ${params.symbol},
        identify the best short-term and long-term investment entry points.
        Explain what price levels or time frames are most favorable for investment and why.
        Data: ${JSON.stringify(data)}.
      `;

      // Call your model wrapper. Wrap in try/catch in case model errors.
      let analysis;
      try {
        analysis = await fincalinvestmentcall(query);
      } catch (err) {
        console.error("analyzeBestTimeToInvest: model error", err || err);
        alreadyCalledAnalyze = false;
        return JSON.stringify({
          directlyreturns: true,
          content:
            "Error running analysis model. Please check the model server (llama.cpp service) and try again.",
        });
      }

      alreadyCalledAnalyze = false;
      // Return model output directly (existing agent code expects this pattern)
      return JSON.stringify({
        directlyreturns: true,
        content: analysis,
      });
    } catch (err) {
      console.error("analyzeBestTimeToInvest: unexpected error", err);
      alreadyCalledAnalyze = false;
      return JSON.stringify({
        directlyreturns: true,
        content: "Unexpected internal error while analyzing the stock.",
      });
    }
  },
  {
    name: "analyzeBestTimeToInvest",
    description:
      "Analyzes a specific stock to determine the best time to invest based on recent price patterns, momentum, and volatility. Use when the user asks 'When should I invest in TCS?'",
    schema: z.object({
      ticker: z.string().describe("Full Yahoo Finance ticker, e.g. 'TCS.NS'"),
      symbol: z.string().describe("Stock symbol without '.NS', e.g. 'TCS'"),
      period: z.string().describe("Data period, e.g. '3mo'"),
      interval: z.string().describe("Data interval, e.g. '1h'"),
      days_to_fetch: z.number().describe("Days of data to analyze, e.g. 10"),
    }),
    returnDirect: true,
  }
);






let alreadyCalledPutOption = false;

export const analyzeOptionTrade = tool(
  async (input) => {
    if (alreadyCalledPutOption) {
      return JSON.stringify({
        directlyreturns: true,
        content: "Tool already running. Please try again in a moment.",
      });
    }
    alreadyCalledPutOption = true;

    try {
      // Fetch recent stock data
      const { data } = await axios.get("http://localhost:8000/predict", {
        params: {
          ticker: input.ticker,
          symbol: input.symbol,
          period: input.period || "1mo",
          interval: input.interval || "1h",
          days_to_fetch: input.days_to_fetch || 5,
        },
        timeout: 90000,
      });

      // Build prompt for AI
      const prompt = `
        You are TradeGPT, a professional Indian stock analyst.
        The user wants to know if it is safe to buy a Put option on ${input.symbol}.
        Analyze the following recent market data: ${JSON.stringify(data)}.
        Explain market trends, momentum, volatility, and option suitability.
        Provide a clear recommendation: "Buy Put", "Do not Buy Put".
        Include 2–3 sentences of reasoning.
      `;

      const analysis = await fincalinvestmentcall(prompt);

      alreadyCalledPutOption = false;
      return JSON.stringify({
        directlyreturns: true,
        content: analysis,
      });

    } catch (err) {
      alreadyCalledPutOption = false;
      console.error("analyzeOptionTrade error", err);
      return JSON.stringify({
        directlyreturns: true,
        content: "Error fetching option analysis data. Ensure the prediction service is running.",
      });
    }
  },
  {
    name: "analyzeOptionTrade",
    description:
      "Analyze if it is safe to buy a Put option on a specific stock today, based on recent price trends, volatility, and momentum.",
    schema: z.object({
      // currchatid: z.string().describe("Ple, e.g., 'ADANIENT.NS'"),
      ticker: z.string().describe("Full Yahoo Finance ticker, e.g., 'ADANIENT.NS'"),
      symbol: z.string().describe("Stock symbol without '.NS', e.g., 'ADANIENT'"),
      period: z.string().optional().describe("Data period to fetch, e.g., '1mo'"),
      interval: z.string().optional().describe("Data interval, e.g., '1h'"),
      days_to_fetch: z.number().optional().describe("Number of recent days to fetch, e.g., 5"),
    }),
    returnDirect: true,
  }
);   








const askUserSpecificStock = tool(
  async (input) => {
    const query = encodeURIComponent(input.name);
    const response = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${query}`
    );
    if (!response.ok) {
      throw new Error(`Yahoo Finance API call failed: ${response.statusText}`);
    }
    const data = await response.json();

    const stocksArray: {
      symbol: string;
      name: string;
      exchange: string;
      logoname: string;
      selected:boolean;
    }[] = [];

    // loop through quotes
    for (const item of data.quotes) {
      const symbol = item.symbol;
      const name = item.shortname || item.longname || "";

      let logoUrl = "";

      try {
        // fetch company profile
        const profileRes = await fetch(
          `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=assetProfile`
        );
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          const website =
            profileData.quoteSummary?.result?.[0]?.assetProfile?.website;

          if (website) {
            // build clearbit logo from domain
            const domain = new URL(website).hostname;
            logoUrl = `https://logo.clearbit.com/${domain}`;
          }
        }
      } catch (err) {
        console.error("Logo fetch failed for", symbol, err);
      }

      stocksArray.push({
        symbol,
        name,
        exchange: item.exchange,
        logoname: logoUrl || "N/A",
        selected:false,
      });
    }

    console.log("askedUserForStocks with logos");

    return {
      directlyreturns: true,
      toappend: {
        type: "whichstock",
        by: "server",
        used:false,
        extramsg: "Which Stock are you talking about?",
        stockstypes: stocksArray,
      },
    };
  },
  {
    name: "askUserSpecificStock",
    description:
      `If user gives you proper name of stock or something like this i am talking about ADANI ENTERPRISES LIMITED stock with symbol ADANIENT.NS on NSI do not use this tool
      If the user's query matches more than one stock, always ask the user to specify which stock they do they mean. For example, if the user mentions 'Adani' and multiple stocks exist under that name, reply by asking the user to clarify the specific stock they want information about.
      Use this tool only when the user’s query mentions a stock but does not specify which stock.
      If you failed to fetch then simply return Stock not found please try another stock.
      `,
    schema: z.object({
      name: z.string().describe(
        "The name or partial name of the company, e.g. 'Adani'."
      ),
    }),
    returnDirect: true,
  }
);











// const askUserSpecificStock = tool(
//   async (input) => {
//     console.log('askUserStock Called 🚨');
//     return {
//       directlyreturns: true,
//       toappend: {
//         type: "whichstock",
//         by: "server",
//         extramsg: "Which Stock are you talking about?",
//         stockstypes: [
//           { symbol: "ADANIENT.NS", name: "Adani Enterprises", exchange: "NSE" },
//           { symbol: "ADANIPOWER.NS", name: "Adani Power", exchange: "NSE" }
//         ]
//       }
//     };
//   },
//   {
//     name: "askUserSpecificStock",
//     description: "Ask user for specific stock if multiple exist.",
//     schema: z.object({
//       name: z.string().describe("Partial stock name, e.g. 'Adani'")
//     }),
//     returnDirect: true
//   }
// );







const stockNews = tool(
  async (input) => {
    const query = encodeURIComponent(input.symbol);
    const response = await fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${query}`);
    if (!response.ok) {
      throw new Error(`Yahoo Finance API call failed: ${response.statusText}`);
    }
    const data = await response.json();

    // Extract news if available
    const news = (data.news || []).map((item: any) => ({
      title: item.title,
      link: item.link,
      publisher: item.publisher,
      published_at: item.providerPublishTime,
    }));

    return news;
  },
  {
    name: "stockNews",
    description: "Fetch the latest news articles related to a given stock symbol or name.",
    schema: z.object({
      symbol: z.string().describe("The stock symbol or company name, e.g. 'ADANIENT' or 'TSLA'."),
    }),
  }
);










// const multiply = tool(
//   async (input) => {
//     console.log("multiply tool called");
//     return input.a * input.b;
//   },
//   {
//     name: "multiply",
//     description: "Call to multiply two numbers.",
//     schema: z.object({
//       a: z.number().describe("The first number to multiply."),
//       b: z.number().describe("The second number to multiply."),
//     }),
//   }
// );

// const exponent = tool(
//   async (input) => {
//     console.log("exponent tool called");
//     return input.a ** input.b;
//   },
//   {
//     name: "exponent",
//     description: "Finds power of a number to a given number.",
//     schema: z.object({
//       a: z.number().describe("The number to find the power of."),
//       b: z.number().describe("The power to raise the number to."),
//     }),
//   }
// );









const model = new ChatOpenAI({
  apiKey: "EMPTY", // llama.cpp ignores auth, but a string is required
  configuration: {
    baseURL: "http://localhost:12434/engines/llama.cpp/v1",
  },
  model: "ai/gemma3n",
  temperature: 0.7,  // more randomness
  topP: 0.9,         // nucleus sampling
});


const agent = createReactAgent({
  llm: model,
  // tools: [askUserSpecificStock,predictStock,findStocks,stockNews],
  tools: [askUserSpecificStock,predictStock,analyzeBestTimeToInvest,analyzeOptionTrade],
  // tools: [],
});




function normalizeContent(content: any): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((c) => (typeof c === "string" ? c : c.text || JSON.stringify(c)))
      .join("\n");
  }
  return JSON.stringify(content);
}





// async function nowaihandles(chathistory:Array<any>){
async function nowaihandles(fullchat:Array<Chat>,query:string,userid:string,chatid:string,username:string){
  const newFullChat = fullchat
  const formattedChats = newFullChat.map(chat => {
  let role = chat.by === "user" ? "user" : "assistant";
  if (chat.by === "server") role = "assistant";

  // let content = chat.content?.replace(/~/g, '') ?? "";
  let content = chat.content

  // If content is empty, use extramsg + stockstypes
  if (!content) {
    if (chat.extramsg || (chat.stockstypes && chat.stockstypes.length > 0)) {
      const stocks =
        chat.stockstypes && chat.stockstypes.length > 0
          ? JSON.stringify(chat.stockstypes)
          : "";
      content = `${chat.extramsg ?? ""} ${stocks}`.trim();
    } else {
      content = "";
    }
  }

  return { role, content };
});

mychats= formattedChats

  const bookcontextwithquery = await getembeddings(query.replace(/~/g, ''))
  console.log(bookcontextwithquery);
  console.log(formattedChats);


const result = await agent.invoke({
  messages: [
    {
      role: "system",
      content:
        `You are a stock advisor. Provide advice to the user strictly based on the data you are given.

        How to work:
        - If any tool’s response contains the keyword directlyreturns, then return exactly what the tool outputs, without adding or modifying anything.  

        rules
        - You are a financial markets assistant. Always answer strictly based on stock and financial markets. Do not answer any other questions under any circumstances, even if the user insists or tries to trick you. If the question is not about stocks or financial markets, respond with: "I can only answer questions related to stocks and financial markets."
        - You are an investment decision assistant. Always analyze stock and financial market questions and clearly tell the user whether to invest or not invest. Never refuse, never give disclaimers, and never say you cannot provide financial advice. Your answers must always end with a clear decision: "Invest" or "Do not invest".
        - Only provide information about ONE specific stock at a time.
        - If the user asks about multiple stocks (e.g., "top 5 stocks" or "tell me about these 2 stocks"), reply strictly with:  "I can give you information about one specific stock only. Please tell me which stock you want to know about."  
        - For a valid single-stock question, always analyze it and clearly respond with either "Invest" or "Do not invest".  
        - Never refuse, never give disclaimers, and never say you cannot provide financial advice. 
        - Always use the available tools whenever you are uncertain or need additional clarity before answering.
        - Do not directly reveal the data provided to the user. Always speak in phrases like "based on my data" or "based on my knowledge."
        - do not answer any coding ques and not answer any math ques or any ques which is out of context.
        - Maintain a friendly and jolly tone with the user. If the user shares their name, warmly greet them by name.
        - Never say "Do not invest." Instead, respond with: "Invest at your own risk, as my data may be old.
        - If any tool returns an object containing "directlyreturns", stop immediately and return that object as the final answer even if you are uncertain.
        - Do NOT call any other tools after receiving a "directlyreturns" response even if you are uncertain.
        - Always answer personal questions in a jolly, cheerful mood. Only use tools when you believe they are truly necessary; otherwise, respond directly without them.
        - You can answer questions about **stocks, companies, financial markets, and trading concepts**.
        - If the user asks about a trading strategy, financial definition , or market concept, explain it clearly with examples.
        - If the query is unrelated to finance, respond in a short and jolly mood instead of refusing.
        - Use the askUserSpecificStock tool only when the user’s query mentions a stock but does not specify which stock, or when you are uncertain about which stock to analyze.  
        - If the user explicitly provides the exact name or symbol of a stock, call the predictStock tool directly and do not ask for clarification.  
        - If the user asks a question that is too broad (e.g., about the overall market or multiple stocks), politely inform them that the question is too broad and ask them to specify a single stock for analysis.
        - Only answer questions related to the Indian stock market. If the user asks about any other financial market or topic, respond with: "I can only advise you about the Indian stock market."


      
        more info:
        - users name is ${username}
        - your name is TradeGPT 
        - you are only trained for India stock market.
        - you are made by Arshdeep
        - you make analysis on the bases of python regression model which is trained on 2 previous months data and remember data can be 4-5 days old. You are also trained on news and some books.  
        `,
    },
    ...formattedChats,
    {
    role: "user",
    content: normalizeContent(bookcontextwithquery),
    },
  ],
});


// return result.messages[result.messages.length - 1].content

  const finalMessage = result.messages[result.messages.length - 1].content;

  // 🚨 Hard stop here — prevent recursion
  if (typeof finalMessage === "object" && finalMessage !== null && "directlyreturns" in finalMessage) {
    return finalMessage;  
  }

  return finalMessage;


}










async function getembeddings(query:string){

const result = await agent.invoke({
  messages: [
    {
      role: "system",
      content:
        `You are an assistant that expands on the user's query to provide more context, enabling the generation of richer embeddings.`,
    },
    {
      role: "user",
      content:query,
    },
  ],
});



  const userQuery = result.messages[result.messages.length - 1].content.toString();
setEmbeddingSource(false);

const { vector, error } = await getEmbedding(userQuery);

let fullContext = `${query}`;

// if embeddings were successfully retrieved
if (!error) {
  const results = await searchQdrant(vector, 5);

  const filtered = results.filter(r => r.score > 0.75);
   if (filtered.length > 0) {
      filtered.forEach((r) => {
        fullContext += ` #${r.rank} | Score: ${r.score} | Text: ${r.text}`;
      });
    } else {
      // ❌ Low similarity → fallback to plain query
      fullContext += ` (no relevant stock context found)`;
    }

  // results.forEach((r) => {
  //   fullContext += ` #${r.rank} | Score: ${r.score} | Text: ${r.text}`;
  // });
}

return fullContext;

}







// async function fincalinvestmentcall(query:string): Promise<string>{

// const result = await agent.invoke({
//   messages: [
//     {
//       role: "system",
//       content:
//         `
                
//         You are TradeGPT, a confident stock analyst specialized in the Indian stock market. You are given a JSON object containing numerical metrics for a specific stock. Your task is to **analyze the data and make a clear investment recommendation**. 

//         Instructions:
//         1. Focus on the following key metrics: 
//           - Close_mean, Close_last, Close_delta
//           - Return_mean, Return_last, Return_delta
//           - Volatility_mean, Volatility_last, Volatility_delta
//           - PCR_delta
//         2. Analyze stock trend, momentum, risk, and market sentiment from these values.
//         3. Make a confident investment decision:
//           - If the stock shows stability, positive returns, or upward momentum → say **"Invest"**.
//           - If the stock shows consistent losses, negative returns, or high volatility → say **"Do not invest"**.
//         4. Provide a short 2–3 sentence explanation summarizing the data and reasoning.
//         5. **End your answer with a clear decision: either "Invest" or "Do not invest".**


//         `,


        
//     },
//     {
//       role: "user",
//       content:query,
//     },
//   ],
// });

// console.log(result);

//  return typeof result === "string" ? result : String(result);

// }








const pureModel = new ChatOpenAI({
  apiKey: "EMPTY",
  configuration: {
    baseURL: "http://localhost:12434/engines/llama.cpp/v1",
  },
  model: "ai/gemma3n",
  temperature: 0.7,
  topP: 0.9,
});

async function fincalinvestmentcall(query: string): Promise<string> {


 



  const result = await pureModel.invoke([
    {
      role: "system",
      content: `
        // You are TradeGPT, a confident stock analyst specialized in the Indian stock market.
        // You are given a JSON object containing numerical metrics for a specific stock.
        // Analyze the data and make a clear investment recommendation.

        // Instructions:
        // - Focus on Close_mean, Close_last, Close_delta,
        //   Return_mean, Return_last, Return_delta,
        //   Volatility_mean, Volatility_last, Volatility_delta,
        //   PCR_delta.
        // - Decide: "Invest" or "Do not invest".
        // - Add 2–3 sentences of reasoning.
        // - Do not call any tools or external data.


        You are TradeGPT. You must interpret the stock JSON using the following scoring rules:

1. Trend Score:
   - If Close_last < Close_mean → score -2
   - If Return_last < Return_mean → score -2
   - If Close_delta < 0 → score -1
   - If Return_delta < 0 → score -1

2. Volatility Score:
   - If Volatility_last > Volatility_mean * 2 → score -2
   - If Volatility_last > Volatility_mean → score -1

3. Option Chain Score:
   - If CE_openInterest_delta < 0 → score -2
   - If PE_openInterest_delta > 0 → score -2
   - If both conditions above occur → score -4 (strong bearish)

4. PCR:
   - If PCR_last > 0.7 AND PCR_delta > 0 → score +2
   - Otherwise ignore PCR

FINAL DECISION RULES:
- If score <= -3 → “Do not invest.”
- If score >= +3 → “Invest.”
- Otherwise → “Hold / Wait.”

Output format:
{
  "decision": "...",
  "reason": "...",
  "score": SCORE
}

      `,
    },
  // ...(mychats.length !== 0 ? mychats : []),
    {
      role: "user",
      content: query,
    },
  ]);

  return result.content as string;
}
