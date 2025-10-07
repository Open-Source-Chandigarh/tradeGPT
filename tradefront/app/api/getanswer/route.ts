import dbConnect from "../../utlis/dbConn";
import Users from "../../models/Users";
import Stocks from "../../models/Stocks";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import jwt, { JwtPayload } from "jsonwebtoken";


import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

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
    user.freechats>0?user.freechats -= 1:" ";
    await user.save();
    }

    let resultfromai = await nowaihandles(body.ques)
    console.log(resultfromai);

    


      // if (typeof resultfromai === "object" && resultfromai !== null && "directlyreturns" in resultfromai) {
      //   console.log("helloworld🍕🍕🍕🍕🍕");
      // }

      if(resultfromai[0]=="{"){
        let parseddata = JSON.parse(resultfromai as string)
        return NextResponse.json(parseddata.toappend, { status: 200 });
      }
      

      
    // Otherwise wrap it as an assistant message
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









const predictStock = tool(
  async (input) => {

    console.log('calledpredict tool');
    const now = new Date();
    const fiveDaysLater = new Date();
    fiveDaysLater.setDate(now.getDate() + 5);
    const foundstock = await Stock.findOne({name:input.symbol})
    if(foundstock){
      if (new Date(foundstock.date) < fiveDaysLater) {
        return {type:"modeltraning",by:"server",content:"pollingTheStock",completed:false};
      }
    }

    const params = new URLSearchParams({
      ticker: input.ticker,
      symbol: input.symbol,
      // period: input.period,
      period: "2mo",
      // interval: input.interval,
      interval: "1h",
      // days_to_fetch: input.days_to_fetch.toString(),
      days_to_fetch: "5",
    });


    const response = fetch(`http://127.0.0.1:8000/predict?${params}`)
    .then(res => res.json())
    .then(data => {
    Stock.findOneAndUpdate(
      { stockname: input.symbol },
      { response: data, date: new Date() },
      { upsert: true }
    ).catch(console.error);
  });
    console.log(response);
    
    

    const stockDoc = await Stock.findOneAndUpdate(
      { stockname: input.symbol },        
      { response, date: new Date() },     
      { upsert: true, new: true }      
    );
    
    return  {toappend:{
            type:"modeltraning",
            by:"server",
            content:"hello world",
            completed:false
          }}
    // return NextResponse.json({toappend:{type:"modeltraning",by:"server",content:input.symbol},sendDirectly: true},{ status: 200 })
    
  },
  {
    name: "predictStock",
    description: "Call this api if you have full name of stock and want to know it's performance if user says eg:- i want to know about ADANI ENTERPRISES LIMITED stock with symbol ADANIENT.NS on NSI",
    schema: z.object({
      ticker: z.string().describe("Ticker symbol from yahoo finance, e.g. 'ADANIENT.NS'"),
      symbol: z.string().describe("Stock symbol for nse, e.g. 'ADANIENT' it will not have .NS at the end"),
      period: z.string().describe("Data period for stock, e.g. '2mo'"),
      interval: z.string().describe("Data interval for stock, e.g. '1h'"),
      days_to_fetch: z.number().describe("Number of days to fetch options data"),
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










const multiply = tool(
  async (input) => {
    console.log("multiply tool called");
    return input.a * input.b;
  },
  {
    name: "multiply",
    description: "Call to multiply two numbers.",
    schema: z.object({
      a: z.number().describe("The first number to multiply."),
      b: z.number().describe("The second number to multiply."),
    }),
  }
);

const exponent = tool(
  async (input) => {
    console.log("exponent tool called");
    return input.a ** input.b;
  },
  {
    name: "exponent",
    description: "Finds power of a number to a given number.",
    schema: z.object({
      a: z.number().describe("The number to find the power of."),
      b: z.number().describe("The power to raise the number to."),
    }),
  }
);









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
  tools: [askUserSpecificStock,predictStock],
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
async function nowaihandles(query:string){

  const bookcontextwithquery = await getembeddings(query)

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
        - your name is TradeGPT 
        - you are only trained for India stock market.
        - you are made by Arshdeep
        - you make analysis on the bases of python regression model which is trained on 2 previous months data and remember data can be 4-5 days old. You are also trained on news and some books.  
        `,
    },
    {
      role: "user",
      content:
        normalizeContent(bookcontextwithquery),
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