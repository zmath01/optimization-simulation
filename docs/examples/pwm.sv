module pwm (
    input  logic       clk,
    input  logic       reset,
    input  logic [3:0] duty,
    output logic       out
);
    logic [3:0] counter;
    always_ff @(posedge clk) begin
        if (reset) counter <= 4'd0;
        else       counter <= counter + 4'd1;
    end
    assign out = !reset && (counter < duty);
endmodule
